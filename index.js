const fs = require('fs')
const path = require('path')
const Module = require('module')
const { EOL } = require('os')

const createRequire = Module.createRequire || Module.createRequireFromPath

function isString (o) {
  return typeof o === 'string'
}

class CMakeLists {
  constructor (filePath) {
    Object.defineProperties(this, {
      path: {
        configurable: true,
        enumerable: true,
        writable: false,
        value: filePath
      },
      _fd: {
        configurable: true,
        enumerable: true,
        writable: false,
        value: fs.openSync(filePath, 'w+')
      }
    })
  }

  write (str) {
    fs.writeSync(this._fd, str)
  }

  writeLine (str) {
    fs.writeSync(this._fd, str + EOL)
  }

  close () {
    fs.closeSync(this._fd)
  }
}

function sep (indent = 2) {
  return EOL + (' ').repeat(indent)
}

function platformTarget (target) {
  switch (process.platform) {
    case 'win32': return target.windows || null
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
    target[key] = Array.from(new Set([...target[key], ...(ostarget[key] || [])]))
  }
}

function mergeObject (target, ostarget, key) {
  if (Object.prototype.hasOwnProperty.call(ostarget, key)) {
    target[key] = {
      ...target[key],
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
  mergeArray(target, ostarget, 'linkOptions')

  mergeObject(target, ostarget, 'defines')
  mergeArray(target, ostarget, 'includePaths')
  mergeArray(target, ostarget, 'publicIncludePaths')
  mergeArray(target, ostarget, 'libPaths')
  mergeArray(target, ostarget, 'libs')
  mergeValue(target, ostarget, 'staticVCRuntime')

  return target
}

function loadConfig (root) {
  return JSON.parse(fs.readFileSync(path.join(root, 'cgen.json'), 'utf8'))
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
  const dependencies = config.dependencies || []
  if (dependencies.length > 0) {
    const requireFunction = createRequire(path.join(configRoot, 'package.json'))
    dependencies.forEach((mod) => {
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

  cmklists.writeLine(`cmake_minimum_required(VERSION ${config.minimumVersion || '3.7'})`)
  cmklists.writeLine(`project(${config.project})`)

  const targets = config.targets

  let injectVCRuntimeFunction = false
  let injectRequireFunction = false

  const dependencies = config.dependencies || []
  if (dependencies.length > 0) {
    if (!injectRequireFunction) {
      cmklists.writeLine(`include("${path.relative(configPath, getCMakeInclude('require')).replace(/\\/g, '/')}")`)
      injectRequireFunction = true
    }
    const requireFunction = createRequire(path.join(configPath, 'package.json'))
    dependencies.forEach((mod) => {
      const root = findProjectRoot(requireFunction.resolve(mod))
      const conf = loadConfig(root)
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
        cmklists.writeLine(`include("${path.relative(configPath, getCMakeInclude('vcruntime')).replace(/\\/g, '/')}")`)
        injectVCRuntimeFunction = true
      }
      cmklists.writeLine(`cgen_target_vcrt_mt(${target.name})`)
    }
  }

  cmklists.close()

  if (config.postScript) {
    const mod = require(path.join(configPath, config.postScript))
    if (mod.__esModule) {
      mod['default'](fs.readFileSync(cmklists.path, 'utf8'), cmklists.path)
    } else {
      mod(fs.readFileSync(cmklists.path, 'utf8'), cmklists.path)
    }
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
  const main = requireFunction.resolve(request)
  const dir = findProjectRoot(main)
  if (fs.existsSync(path.join(dir, 'cgen.json'))) {
    const relativeDir = path.relative(dirname, dir).replace(/\\/g, '/')
    return `${dir},${relativeDir}`
  }
  return ''
}

module.exports = {
  generateCMakeLists,
  getCMakeInclude,
  findProjectRoot,
  resolve,
  loadConfig,
  cleanBuild
}
