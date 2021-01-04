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

function loadConfig (root, options = {}) {
  const json = path.join(root, 'cgen.config.json')
  if (fs.existsSync(json)) {
    return JSON.parse(fs.readFileSync(json, 'utf8'))
  }
  const js = path.join(root, 'cgen.config.js')
  const o = getDefaultExport(require(js))
  if (typeof o === 'function') {
    return o(options)
  }
  if (typeof o === 'object' && o !== null) {
    return o
  }
  throw new Error('Invalid config')
}

function sep (indent = 2) {
  return EOL + (' ').repeat(indent)
}

function platformTarget (target) {
  switch (process.platform) {
    case 'win32': return {
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
  const config = loadConfig(configRoot)
  const dependencies = config.dependencies || {}
  const names = Object.keys(dependencies)
  if (names.length > 0) {
    const requireFunction = createRequire(path.join(configRoot, 'package.json'))
    names.forEach((mod) => {
      const root = findProjectRoot(requireFunction.resolve(mod))
      // const conf = loadConfig(root)
      cleanBuild(root, buildDirName)
    })
  }
  const cmk = path.join(configRoot, 'CMakeLists.txt')
  const out = path.join(configRoot, buildDirName)
  if (fs.existsSync(cmk)) rmSync(cmk)
  if (fs.existsSync(out)) rmSync(out)
}

function generateCMakeLists (config, configPath) {
  const cmklists = new CMakeLists(path.join(configPath, 'CMakeLists.txt'))

  cmklists.writeHeadLine(`cmake_minimum_required(VERSION ${config.minimumVersion || '3.7'})`)
  
  cmklists.writeHeadLine(`if(\${CMAKE_VERSION} VERSION_GREATER_EQUAL "3.15.0")`)
  cmklists.writeHeadLine(`  cmake_policy(SET CMP0091 NEW)`)
  cmklists.writeHeadLine(`endif()`)
  cmklists.writeHeadLine(`project(${config.project})`)

  const targets = config.targets

  let injectVCRuntimeFunction = false
  let injectRequireFunction = false

  const dependencies = config.dependencies || {}
  const names = Object.keys(dependencies)
  if (names.length > 0) {
    if (!injectRequireFunction) {
      cmklists.writeIncludeLine(`include("${path.relative(configPath, getCMakeInclude('require')).replace(/\\/g, '/')}")`)
      injectRequireFunction = true
    }
    const requireFunction = createRequire(path.join(configPath, 'package.json'))
    names.forEach((mod) => {
      const root = findProjectRoot(requireFunction.resolve(mod))
      const conf = loadConfig(root, dependencies[mod] || {})
      generateCMakeLists(conf, root)
      cmklists.writeLine(`cgen_require("${mod}")`)
    })
  }

  for (let i = 0; i < targets.length; i++) {
    const target = targets[i]
    const ostarget = platformTarget(target)
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
      if (!injectVCRuntimeFunction) {
        cmklists.writeIncludeLine(`include("${path.relative(configPath, getCMakeInclude('vcruntime')).replace(/\\/g, '/')}")`)
        injectVCRuntimeFunction = true
      }
      cmklists.writeLine(`cgen_target_vcrt_mt(${target.name})`)
    }
  }

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
