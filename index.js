'use strict'
Object.defineProperty(exports, '__esModule', { value: true })

const fs = require('fs')
const path = require('path')
const Module = require('module')
const { EOL } = require('os')

const createRequire = Module.createRequire || Module.createRequireFromPath

const { CMakeLists } = require('./lib/CMakeLists')

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

function platformTarget (target, isEmscripten) {
  switch (process.platform) {
    case 'win32': return isEmscripten ? null : {
      compileOptions: ['/source-charset:utf-8'],
      defines: ['_CRT_SECURE_NO_WARNINGS', 'UNICODE', '_UNICODE'],
      ...(target.windows || {})
    }
    case 'linux': return target.linux || null
    case 'darwin': return target.macos || null
    default: return null
  }
}

function mergeValue (target, ostarget, key) {
  if (Object.prototype.hasOwnProperty.call(ostarget, key)) {
    target[key] = ostarget[key]
  }
}

function mergeArray (target, ostarget, key) {
  if (Object.prototype.hasOwnProperty.call(ostarget, key)) {
    target[key] = Array.from(new Set([...(target[key] || []), ...(ostarget[key] || [])]))
  }
}

function mergeObject (target, ostarget, key) {
  if (Object.prototype.hasOwnProperty.call(ostarget, key)) {
    target[key] = {
      ...(target[key] || {}),
      ...(ostarget[key] || {})
    }
  }
}

function mergeTarget (target, ostarget) {
  mergeValue(target, ostarget, 'name')
  mergeValue(target, ostarget, 'type')
  mergeArray(target, ostarget, 'sources')
  mergeValue(target, ostarget, 'cStandard')
  mergeValue(target, ostarget, 'cxxStandard')
  mergeArray(target, ostarget, 'compileOptions')
  mergeArray(target, ostarget, 'linkOptions')

  mergeArray(target, ostarget, 'defines')
  mergeArray(target, ostarget, 'publicDefines')
  mergeArray(target, ostarget, 'includePaths')
  mergeArray(target, ostarget, 'publicIncludePaths')
  mergeArray(target, ostarget, 'libPaths')
  mergeArray(target, ostarget, 'libs')
  mergeValue(target, ostarget, 'staticVCRuntime')

  return target
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

function toPathString (str) {
  return `"${str.replace(/\\/g, '/')}"`
}

function generateCMakeLists (config, configPath, options, isEmscripten, parentPath) {
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

  cmklists.writeHeadLine(`# ${JSON.stringify(options)}`)
  cmklists.writeHeadLine(`cmake_minimum_required(VERSION ${config.minimumVersion || '3.9'})`)
  
  cmklists.writeHeadLine(`if(\${CMAKE_VERSION} VERSION_GREATER_EQUAL "3.15.0")`)
  cmklists.writeHeadLine(`  cmake_policy(SET CMP0091 NEW)`)
  cmklists.writeHeadLine(`endif()`)
  cmklists.writeHeadLine(`if(APPLE)`)
  cmklists.writeHeadLine(`  cmake_policy(SET CMP0068 NEW)`)
  cmklists.writeHeadLine(`endif()`)
  cmklists.writeHeadLine(`project(${config.project})`)

  cmklists.writeLine('')
  cmklists.writeLine('# ======= START =======')
  cmklists.writeLine('')

  if (isEmscripten && isMain) {
    cmklists.writeIncludeLine(`include("${path.relative(configPath, getCMakeInclude('embuild')).replace(/\\/g, '/')}")`)
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
      cmklists.writeIncludeLine(`include("${path.relative(configPath, getCMakeInclude('require')).replace(/\\/g, '/')}")`)
      injectRequireFunction = true
    }
    const requireFunction = createRequire(path.join(configPath, 'package.json'))
    names.forEach((mod) => {
      const root = findProjectRoot(requireFunction.resolve(mod))
      const options = dependencies[mod] || {}
      const conf = loadConfig(root, options, configPath, false)
      generateCMakeLists(conf, root, options, isEmscripten, cmklistPath)
      cmklists.writeLine(`cgen_require("${mod}")`)
    })
  }

  for (let i = 0; i < targets.length; i++) {
    const target = targets[i]
    const ostarget = platformTarget(target, isEmscripten)
    if (ostarget) {
      mergeTarget(target, ostarget)
    }

    cmklists.writeLine(`file(GLOB_RECURSE ${target.name}_SRC${sep()}${target.sources.map(s => JSON.stringify(s)).join(sep())})`)
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
        cmklists.writeLine(`target_link_options(${target.name} INTERFACE "-Wl,-rpath='$ORIGIN'")`)
      }
    } else if (target.type === 'node') {
      if (process.platform === 'win32' && !isEmscripten) {
        cmklists.writeLine(`add_library(${target.name} SHARED \${${target.name}_SRC} "${path.relative(configPath, path.join(__dirname, 'src/win_delay_load_hook.cc')).replace(/\\/g, '/')}")`)
      } else {
        cmklists.writeLine(`add_library(${target.name} SHARED \${${target.name}_SRC})`)
        cmklists.writeLine(`set_target_properties(${target.name} PROPERTIES PREFIX "")`)
      }
      cmklists.writeLine(`set_target_properties(${target.name} PROPERTIES SUFFIX ".node")`)
      const devDir = require('env-paths')('node-gyp', { suffix: '' }).cache
      const nodeDir = path.join(devDir, process.versions.node)
      const nodeLibFile = path.join(nodeDir, process.arch, 'node.lib')

      target.includePaths = Array.from(new Set([...(target.includePaths || []), ...([
        toPathString(`${nodeDir}/include/node`),
        toPathString(`${nodeDir}/src`),
        toPathString(`${nodeDir}/deps/openssl/config`),
        toPathString(`${nodeDir}/deps/openssl/openssl/include`),
        toPathString(`${nodeDir}/deps/uv/include`),
        toPathString(`${nodeDir}/deps/zlib`),
        toPathString(`${nodeDir}/deps/v8/include`)
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
          '-undefined dynamic_lookup'
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
          '/LTCG:INCREMENTAL'
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
          toPathString(nodeLibFile)
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
      cmklists.writeLine(`target_compile_definitions(${target.name} PRIVATE${sep()}${defines.map(v => v.replace(/"/g, '\\"')).join(sep())})`)
    }
    const publicDefines = target.publicDefines || []
    if (publicDefines.length > 0) {
      cmklists.writeLine(`target_compile_definitions(${target.name} PUBLIC${sep()}${publicDefines.map(v => v.replace(/"/g, '\\"')).join(sep())})`)
    }
    const includePaths = target.includePaths || []
    if (includePaths.length > 0) {
      cmklists.writeLine(`target_include_directories(${target.name} PRIVATE${sep()}${includePaths.join(sep())})`)
    }
    const publicIncludePaths = target.publicIncludePaths || []
    if (publicIncludePaths.length > 0) {
      cmklists.writeLine(`target_include_directories(${target.name} PUBLIC${sep()}${publicIncludePaths.join(sep())})`)
    }
    const libPaths = target.libPaths || []
    if (libPaths.length > 0) {
      cmklists.writeLine(`target_link_directories(${target.name} PRIVATE${sep()}${libPaths.join(sep())})`)
    }
    const libs = target.libs || []
    if (libs.length > 0) {
      cmklists.writeLine(`target_link_libraries(${target.name}${sep()}${libs.join(sep())})`)
    }
    const compileOptions = target.compileOptions || []
    if (compileOptions.length > 0) {
      cmklists.writeLine(`target_compile_options(${target.name} PRIVATE${sep()}${compileOptions.join(sep())})`)
    }
    const linkOptions = target.linkOptions || []
    if (linkOptions.length > 0) {
      cmklists.writeLine(`target_link_options(${target.name} PRIVATE${sep()}${linkOptions.join(sep())})`)
    }

    if (!!target.staticVCRuntime) {
      if (isMain && !injectVCRuntimeFunction) {
        cmklists.writeIncludeLine(`include("${path.relative(configPath, getCMakeInclude('vcruntime')).replace(/\\/g, '/')}")`)
        injectVCRuntimeFunction = true
      }
      cmklists.writeLine(`cgen_target_vcrt_mt(${target.name})`)
    }
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
