'use strict'
Object.defineProperty(exports, '__esModule', { value: true })

const fs = require('fs')
const path = require('path')
const Module = require('module')
const { EOL } = require('os')

const createRequire = Module.createRequire || Module.createRequireFromPath

const { CMakeLists } = require('./lib/CMakeLists.js')
const { platformTarget, mergeOSTarget, mergeDefaultTarget } = require('./lib/merge.js')

function isString (o) {
  return typeof o === 'string'
}

const configFiles = [
  'cgen.config.json',
  'cgen.config.js'
]

function existsConfigFile (root) {
  for (let i = 0; i < configFiles.length; i++) {
    if (fs.existsSync(path.join(root, configFiles[i]))) {
      return true
    }
  }
  return false
}

function getDefaultExport (exports) {
  if (exports.__esModule) {
    return exports['default']
  }
  return exports
}

function loadConfig (root, options, parentRootDir, isClean) {
  options = options || {}
  const json = path.join(root, 'cgen.config.json')
  if (fs.existsSync(json)) {
    return JSON.parse(fs.readFileSync(json, 'utf8'))
  }
  const js = path.join(root, 'cgen.config.js')
  const o = getDefaultExport(require(js))
  if (typeof o === 'function') {
    return o(options, parentRootDir, isClean)
  }
  if (typeof o === 'object' && o !== null) {
    return o
  }
  throw new Error('Invalid config')
}

function sep (indent = 2) {
  return EOL + (' ').repeat(indent)
}

function rmSync (p) {
  if (typeof fs.rmSync === 'function') {
    fs.rmSync(p, { recursive: true, force: true })
  } else {
    fs.rmdirSync(p, { recursive: true })
  }
}

function cleanBuild (configRoot, buildDirName) {
  const config = loadConfig(configRoot, {}, null, true)
  const dependencies = config.dependencies || {}
  const names = Object.keys(dependencies)
  if (names.length > 0) {
    const requireFunction = createRequire(path.join(configRoot, 'package.json'))
    names.forEach((mod) => {
      const root = findProjectRoot(requireFunction.resolve(mod))
      cleanBuild(root, buildDirName, configRoot, true)
    })
  }
  const cmk = path.join(configRoot, 'CMakeLists.txt')
  const out = path.join(configRoot, buildDirName)
  if (fs.existsSync(cmk)) rmSync(cmk)
  if (fs.existsSync(out)) rmSync(out)
}

function q (str) {
  return `"${str.replace(/\\/g, '/').replace(/"/g, '\\"')}"`
}

/**
 * @param {any} obj 
 * @param {Record<string, string>} defines 
 * @param {Map<object, object>} seen 
 */
function e (obj, defines, seen) {
  seen = seen || new Map()
  if (typeof obj === 'string') {
    return obj.replace(/%(\S+?)%/g, (substring, $1) => {
      if ($1 in defines) {
        try {
          return defines[$1].toString()
        } catch (_) {
          return String(defines[$1])
        }
      }
      return substring
    })
  } else if (Array.isArray(obj)) {
    if (seen.has(obj)) return seen.get(obj)
    const a = obj.map(s => e(s, defines, seen))
    seen.set(obj, a)
    return a
  } else if (typeof obj === 'object' && obj !== null) {
    if (seen.has(obj)) return seen.get(obj)
    const o = {}
    Object.keys(obj).forEach(k => {
      o[k] = e(obj[k], defines, seen)
    })
    seen.set(obj, o)
    return o
  } else {
    return obj
  }
}

function generateCMakeLists (config, configPath, options, isEmscripten, parentPath, nodeConfig, defines) {
  const cmklistPath = path.join(configPath, 'CMakeLists.txt')
  if (fs.existsSync(cmklistPath)) {
    const o = fs.readFileSync(cmklistPath, 'utf8').split(/\r?\n/)[0].slice(2)
    if (JSON.stringify(options) === o) {
      return
    }
    const original = JSON.parse(o)
    options = {
      ...original,
      ...options,
    }
    console.warn(require('chalk').yellowBright(`Overwrite "${cmklistPath}" with options:${EOL}<<<<<<<${EOL}${JSON.stringify(original, null, 2)}${EOL}=======${EOL}${JSON.stringify(options, null, 2)}${EOL}>>>>>>>`))
  }
  const cmklists = new CMakeLists(cmklistPath)
  const isMain = !parentPath

  const mergedDefines = {
    ...(config.variables || {}),
    ...(defines || {})
  }
  Object.setPrototypeOf(mergedDefines, null)
  config = e(config, mergedDefines)

  cmklists.writeHeadLine(`# ${JSON.stringify(options)}`)
  if (isMain) {
    cmklists.writeHeadLine(`cmake_minimum_required(VERSION ${config.minimumVersion || '3.9'})`)

    cmklists.writeHeadLine(`if(\${CMAKE_VERSION} VERSION_GREATER_EQUAL "3.15.0")`)
    cmklists.writeHeadLine(`  cmake_policy(SET CMP0091 NEW)`)
    cmklists.writeHeadLine(`endif()`)
    cmklists.writeHeadLine(`if(APPLE)`)
    cmklists.writeHeadLine(`  cmake_policy(SET CMP0068 NEW)`)
    cmklists.writeHeadLine(`endif()`)
  }
  cmklists.writeHeadLine(`project(${config.project})`)

  cmklists.writeLine('')
  cmklists.writeLine('# ======= START =======')
  cmklists.writeLine('')

  if (isEmscripten && isMain) {
    cmklists.writeIncludeLine(`include(${q(path.relative(configPath, getCMakeInclude('embuild')))})`)
    cmklists.writeLine(`
if(\${CMAKE_BUILD_TYPE} MATCHES "Debug")
  foreach(var
    CMAKE_C_FLAGS_DEBUG
    CMAKE_CXX_FLAGS_DEBUG
  )
    string(REPLACE "-g" "-g4 --source-map-base ./" \${var} "\${\${var}}")
    message(STATUS "\${var}:\${\${var}}")
  endforeach()
else()
  foreach(var
    CMAKE_C_FLAGS_RELEASE
    CMAKE_CXX_FLAGS_RELEASE
    CMAKE_EXE_LINKER_FLAGS_RELEASE
  )
    string(REPLACE "-O2" "-O3" \${var} "\${\${var}}")
    message(STATUS "\${var}:\${\${var}}")
  endforeach()
endif()`)
  }

  const targets = config.targets

  let injectVCRuntimeFunction = false
  let injectRequireFunction = false

  const dependencies = config.dependencies || {}
  const names = Object.keys(dependencies)
  if (names.length > 0) {
    if (isMain && !injectRequireFunction) {
      cmklists.writeIncludeLine(`include(${q(path.relative(configPath, getCMakeInclude('require')))})`)
      injectRequireFunction = true
    }
    const requireFunction = createRequire(path.join(configPath, 'package.json'))
    names.forEach((mod) => {
      const root = findProjectRoot(requireFunction.resolve(mod))
      const options = dependencies[mod] || {}
      const conf = loadConfig(root, options, configPath, false)
      generateCMakeLists(conf, root, options, isEmscripten, cmklistPath, nodeConfig, defines)
      cmklists.writeLine(`cgen_require(${q(mod)})`)
    })
  }

  const targetDefault = config.targetDefault || {}

  for (let i = 0; i < targets.length; i++) {
    const target = targets[i]
    const ostarget = platformTarget(target, isEmscripten)
    if (ostarget) {
      mergeDefaultTarget(target, targetDefault, isEmscripten)
      mergeOSTarget(target, ostarget)
    }

    cmklists.writeLine('')
    cmklists.writeLine(`# ======= START: ${target.name} =======`)
    cmklists.writeLine('')

    cmklists.writeLine(`file(GLOB_RECURSE ${target.name}_SRC${sep()}${target.sources.map(s => q(s)).join(sep())})`)
    if (target.type === 'exe') {
      cmklists.writeLine(`add_executable(${target.name} \${${target.name}_SRC})`)
    } else if (target.type === 'lib') {
      cmklists.writeLine(`add_library(${target.name} STATIC \${${target.name}_SRC})`)
    } else if (target.type === 'dll') {
      cmklists.writeLine(`add_library(${target.name} SHARED \${${target.name}_SRC})`)
      if (!(process.platform === 'win32' && !isEmscripten)) {
        target.compileOptions = Array.from(new Set([...(target.compileOptions || []), ...([
          '-fPIC'
        ])]))
        target.interfaceLinkOptions = Array.from(new Set([...(target.interfaceLinkOptions || []), ...([
          "-Wl,-rpath='$ORIGIN'"
        ])]))
        // cmklists.writeLine(`target_link_options(${target.name} INTERFACE "-Wl,-rpath='$ORIGIN'")`)
      }
    } else if (target.type === 'node') {
      if (process.platform === 'win32' && !isEmscripten) {
        cmklists.writeLine(`add_library(${target.name} SHARED \${${target.name}_SRC} ${q(path.relative(configPath, path.join(__dirname, 'src/win_delay_load_hook.cc')))})`)
      } else {
        cmklists.writeLine(`add_library(${target.name} SHARED \${${target.name}_SRC})`)
        cmklists.writeLine(`set_target_properties(${target.name} PROPERTIES PREFIX "")`)
      }
      cmklists.writeLine(`set_target_properties(${target.name} PROPERTIES SUFFIX ".node")`)
      const devDir = nodeConfig.devdir || require('env-paths')('node-gyp', { suffix: '' }).cache
      const nodeDir = nodeConfig.nodedir || path.join(devDir, nodeConfig.target || process.versions.node)

      target.includePaths = Array.from(new Set([...(target.includePaths || []), ...([
        `${nodeDir}/include/node`,
        `${nodeDir}/src`,
        `${nodeDir}/deps/openssl/config`,
        `${nodeDir}/deps/openssl/openssl/include`,
        `${nodeDir}/deps/uv/include`,
        `${nodeDir}/deps/zlib`,
        `${nodeDir}/deps/v8/include`
      ])]))
      target.defines = Array.from(new Set([...(target.defines || []), ...([
        'BUILDING_UV_SHARED=1',
        'BUILDING_V8_SHARED=1',
        `NODE_GYP_MODULE_NAME=${target.name}`,
        'USING_UV_SHARED=1',
        'USING_V8_SHARED=1',
        'V8_DEPRECATION_WARNINGS=1',
        'BUILDING_NODE_EXTENSION',
        ...((process.platform === 'win32' && !isEmscripten) ? ['HOST_BINARY="node.exe"'] : ['_LARGEFILE_SOURCE', '_FILE_OFFSET_BITS=64']),
        ...(process.platform === 'darwin' ? ['_DARWIN_USE_64_BIT_INODE=1'] : [])
      ])]))
      if (process.platform === 'darwin') {
        target.linkOptions = Array.from(new Set([...(target.linkOptions || []), ...([
          '-undefined', 'dynamic_lookup'
        ])]))
        cmklists.writeLine(`set_target_properties(${target.name} PROPERTIES BUILD_WITH_INSTALL_NAME_DIR 1 INSTALL_NAME_DIR "@rpath")`)
      }
      if (process.platform === 'win32' && !isEmscripten) {
        target.staticVCRuntime = typeof target.staticVCRuntime === 'boolean' ? target.staticVCRuntime : true
        target.compileOptions = Array.from(new Set([...(target.compileOptions || []), ...([
          '/GL'
        ])]))
        target.linkOptions = Array.from(new Set([...(target.linkOptions || []), ...([
          '/ignore:4199,4251',
          `/DELAYLOAD:node.exe`,
          '/OPT:REF',
          '/OPT:ICF',
          '/LTCG:INCREMENTAL',
          '/INCREMENTAL:NO'
        ])]))
        target.libs = Array.from(new Set([...(target.libs || []), ...([
          'kernel32',
          'user32',
          'gdi32',
          'winspool',
          'comdlg32',
          'advapi32',
          'shell32',
          'ole32',
          'oleaut32',
          'uuid',
          'odbc32',
          'DelayImp',
          path.join(nodeDir, nodeConfig.arch || process.arch, 'node.lib')
        ])]))
      } else {
        target.compileOptions = Array.from(new Set([...(target.compileOptions || []), ...([
          '-fPIC'
        ])]))
      }
    } else {
      continue
    }

    if (isString(target.cStandard)) {
      cmklists.writeLine(`set_target_properties(${target.name} PROPERTIES C_STANDARD ${target.cStandard})`)
    }
    if (isString(target.cxxStandard)) {
      cmklists.writeLine(`set_target_properties(${target.name} PROPERTIES CXX_STANDARD ${target.cxxStandard})`)
    }

    const defines = target.defines || []
    if (defines.length > 0) {
      cmklists.writeLine(`target_compile_definitions(${target.name} PRIVATE${sep()}${defines.map(v => q(v)).join(sep())})`)
    }
    const interfaceDefines = target.interfaceDefines || []
    if (interfaceDefines.length > 0) {
      cmklists.writeLine(`target_compile_definitions(${target.name} INTERFACE${sep()}${interfaceDefines.map(v => q(v)).join(sep())})`)
    }
    const publicDefines = target.publicDefines || []
    if (publicDefines.length > 0) {
      cmklists.writeLine(`target_compile_definitions(${target.name} PUBLIC${sep()}${publicDefines.map(v => q(v)).join(sep())})`)
    }
    const includePaths = target.includePaths || []
    if (includePaths.length > 0) {
      cmklists.writeLine(`target_include_directories(${target.name} PRIVATE${sep()}${includePaths.map(v => q(v)).join(sep())})`)
    }
    const interfaceIncludePaths = target.interfaceIncludePaths || []
    if (interfaceIncludePaths.length > 0) {
      cmklists.writeLine(`target_include_directories(${target.name} INTERFACE${sep()}${interfaceIncludePaths.map(v => q(v)).join(sep())})`)
    }
    const publicIncludePaths = target.publicIncludePaths || []
    if (publicIncludePaths.length > 0) {
      cmklists.writeLine(`target_include_directories(${target.name} PUBLIC${sep()}${publicIncludePaths.map(v => q(v)).join(sep())})`)
    }
    const libPaths = target.libPaths || []
    if (libPaths.length > 0) {
      cmklists.writeLine(`target_link_directories(${target.name} PRIVATE${sep()}${libPaths.map(v => q(v)).join(sep())})`)
    }
    const interfaceLibPaths = target.interfaceLibPaths || []
    if (interfaceLibPaths.length > 0) {
      cmklists.writeLine(`target_link_directories(${target.name} INTERFACE${sep()}${interfaceLibPaths.map(v => q(v)).join(sep())})`)
    }
    const publicLibPaths = target.publicLibPaths || []
    if (publicLibPaths.length > 0) {
      cmklists.writeLine(`target_link_directories(${target.name} PUBLIC${sep()}${publicLibPaths.map(v => q(v)).join(sep())})`)
    }
    const libs = target.libs || []
    if (libs.length > 0) {
      cmklists.writeLine(`target_link_libraries(${target.name}${sep()}${libs.map(v => q(v)).join(sep())})`)
    }
    const compileOptions = target.compileOptions || []
    if (compileOptions.length > 0) {
      cmklists.writeLine(`target_compile_options(${target.name} PRIVATE${sep()}${compileOptions.map(v => q(v)).join(sep())})`)
    }
    const interfaceCompileOptions = target.interfaceCompileOptions || []
    if (interfaceCompileOptions.length > 0) {
      cmklists.writeLine(`target_compile_options(${target.name} INTERFACE${sep()}${interfaceCompileOptions.map(v => q(v)).join(sep())})`)
    }
    const publicCompileOptions = target.publicCompileOptions || []
    if (publicCompileOptions.length > 0) {
      cmklists.writeLine(`target_compile_options(${target.name} PUBLIC${sep()}${publicCompileOptions.map(v => q(v)).join(sep())})`)
    }
    const linkOptions = target.linkOptions || []
    if (linkOptions.length > 0) {
      cmklists.writeLine(`target_link_options(${target.name} PRIVATE${sep()}${linkOptions.map(v => q(v)).join(sep())})`)
    }
    const interfaceLinkOptions = target.interfaceLinkOptions || []
    if (interfaceLinkOptions.length > 0) {
      cmklists.writeLine(`target_link_options(${target.name} INTERFACE${sep()}${interfaceLinkOptions.map(v => q(v)).join(sep())})`)
    }
    const publicLinkOptions = target.publicLinkOptions || []
    if (publicLinkOptions.length > 0) {
      cmklists.writeLine(`target_link_options(${target.name} PUBLIC${sep()}${publicLinkOptions.map(v => q(v)).join(sep())})`)
    }

    if (!!target.staticVCRuntime) {
      if (isMain && !injectVCRuntimeFunction) {
        cmklists.writeIncludeLine(`include(${q(path.relative(configPath, getCMakeInclude('vcruntime')))})`)
        injectVCRuntimeFunction = true
      }
      cmklists.writeLine(`cgen_target_vcrt_mt(${target.name})`)
    }

    cmklists.writeLine('')
    cmklists.writeLine(`# ======= END: ${target.name} =======`)
    cmklists.writeLine('')
  }

  cmklists.writeLine('')
  cmklists.writeLine('# ======= END =======')
  cmklists.close()

  if (config.postScript) {
    const mod = require(path.join(configPath, config.postScript))
    getDefaultExport(mod)(fs.readFileSync(cmklists.path, 'utf8'), cmklists.path)
  }
}

function getCMakeInclude (key) {
  switch (key) {
    case 'vcruntime': return path.join(__dirname, 'cmake/vcruntime.cmake')
    case 'require': return path.join(__dirname, 'cmake/require.cmake')
    case 'embuild': return path.join(__dirname, 'cmake/embuild.cmake')
    default: return ''
  }
}

function findProjectRoot (start) {
  let current = start ? path.resolve(start) : process.cwd()
  let previous = ''
  do {
    const target = path.join(current, 'package.json')
    if (fs.existsSync(target) && fs.statSync(target).isFile()) {
      return current
    }
    previous = current
    current = path.dirname(current)
  } while (current !== previous)
  return ''
}

function resolve (dirname, requireFunction, request) {
  if (!path.isAbsolute(request) && request.charAt(0) !== '.') {
    const main = requireFunction.resolve(request)
    const dir = findProjectRoot(main)
    if (existsConfigFile(dir)) {
      const relativeDir = path.relative(dirname, dir).replace(/\\/g, '/')
      return `${dir},${relativeDir}`
    }
    return ''
  }
  if (!path.isAbsolute(request)) request = path.join(dirname, request)
  const relativeDir = path.relative(dirname, request).replace(/\\/g, '/')
  return `${request},${relativeDir}`
}

function defineObjectConfig (o) {
  return o
}

function defineFunctionConfig (f) {
  return f
}

exports.generateCMakeLists = generateCMakeLists
exports.getCMakeInclude = getCMakeInclude
exports.findProjectRoot = findProjectRoot
exports.resolve = resolve
exports.loadConfig = loadConfig
exports.cleanBuild = cleanBuild
exports.defineObjectConfig = defineObjectConfig
exports.defineFunctionConfig = defineFunctionConfig
