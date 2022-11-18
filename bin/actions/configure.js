const path = require('path')
const { CommandLineAction } = require('@rushstack/ts-command-line')

class ConfigureAction extends CommandLineAction {
  constructor () {
    super({
      actionName: 'configure',
      summary: 'Configure project',
      documentation: 'Configure project'
    })
  }

  onDefineParameters () {
    this._debug = this.defineFlagParameter({
      parameterLongName: '--debug',
      parameterShortName: '-d',
      description: 'Set debug build type'
    })

    this._emscripten = this.defineFlagParameter({
      parameterLongName: '--emscripten',
      parameterShortName: '-e',
      description: 'Use emscripten tool chain'
    })

    this._target = this.defineStringParameter({
      argumentName: 'TARGET',
      parameterLongName: '--target',
      parameterShortName: '-t',
      description: 'Target node version',
      defaultValue: process.env.npm_config_target || process.versions.node,
      environmentVariable: 'NPM_CONFIG_TARGET'
    })

    this._arch = this.defineChoiceParameter({
      alternatives: ['ia32', 'x64'],
      parameterLongName: '--arch',
      parameterShortName: '-a',
      description: 'Target architecture',
      defaultValue: process.env.npm_config_arch || process.arch,
      environmentVariable: 'NPM_CONFIG_ARCH'
    })

    this._devdir = this.defineStringParameter({
      argumentName: 'DEVDIR',
      parameterLongName: '--devdir',
      description: 'Node sdk root directory',
      defaultValue: process.env.npm_config_devdir || require('env-paths')('node-gyp', { suffix: '' }).cache,
      environmentVariable: 'NPM_CONFIG_DEVDIR'
    })

    this._generator = this.defineStringParameter({
      argumentName: 'GENERATOR',
      parameterLongName: '--generator',
      parameterShortName: '-G',
      required: false,
      description: 'CMake generator',
    })

    this._skip = this.defineFlagParameter({
      argumentName: 'SKIP',
      parameterLongName: '--skip',
      description: 'Generate CMakeLists.txt only',
    })

    this._nodedir = this.defineStringParameter({
      argumentName: 'NODEDIR',
      parameterLongName: '--nodedir',
      parameterShortName: '-n',
      description: 'Path to the node sdk',
      defaultValue: process.env.npm_config_nodedir || '',
      environmentVariable: 'NPM_CONFIG_NODEDIR'
    })

    this._defines = this.defineStringListParameter({
      argumentName: 'DEFINES',
      parameterLongName: '--define',
      parameterShortName: '-D',
      description: 'Define variables'
    })

    this._cmakeDefines = this.defineStringListParameter({
      argumentName: 'CMAKEDEF',
      parameterLongName: '--cmkdef',
      parameterShortName: '-C',
      description: 'Define cmake variables'
    })

    this._options = this.defineStringListParameter({
      argumentName: 'OPTIONS',
      parameterLongName: '--option',
      parameterShortName: '-s',
      description: 'Define global options'
    })

    this._builddir = this.defineStringParameter({
      argumentName: 'BUILDDIR',
      parameterLongName: '--builddir',
      parameterShortName: '-B',
      description: 'Path to the output, must be relative to cwd',
      defaultValue: '.cgenbuild'
    })

    this._remainder = this.defineCommandLineRemainder({
      description: 'Arguments after -- pass to cmake'
    })
  }

  onExecute () {
    const { loadConfig, generateCMakeLists } = require('../..')
    const buildDir = this._builddir.value
    const root = process.cwd()

    const defines = Object.create(null)
    const cmakeDefines = Object.create(null)
    const globalOptions = Object.create(null)
    const parseFunction = (map, defaultValue) => (s) => {
      const i = s.indexOf('=')
      let k, v
      if (i === -1) {
        k = s
        v = defaultValue
      } else {
        k = s.substring(0, i)
        v = s.substring(i + 1)
      }
      map[k] = v
    }
    this._defines.values.forEach(parseFunction(defines, ''))
    this._cmakeDefines.values.forEach(parseFunction(cmakeDefines, ''))
    this._options.values.forEach(parseFunction(globalOptions, true))

    const config = loadConfig(root, globalOptions, {
      parentRootDir: null,
      isClean: false,
      isDebug: !!this._debug.value,
      isEmscripten: !!this._emscripten.value
    })

    generateCMakeLists({
      config: config,
      configPath: root, 
      globalOptions: globalOptions,
      options: {},
      isEmscripten: !!this._emscripten.value,
      parentPath: null,
      nodeConfig: {
        target: this._target.value,
        arch: this._arch.value,
        devdir: this._devdir.value,
        nodedir: this._nodedir.value
      },
      defines: defines,
      isDebug: !!this._debug.value
    })
    if (this._skip.value) {
      return Promise.resolve()
    }
    const cmake = require('../util/cmake.js')
    const dd = this.remainder.values.indexOf('--')
    const raw = dd === -1 ? [] : this.remainder.values.slice(dd + 1)
    const promise = this._emscripten.value ? cmake.emConfigure(root, path.join(root, buildDir), this._generator.value, {
      CMAKE_C_STANDARD: '11',
      CMAKE_CXX_STANDARD: '17',
      CMAKE_BUILD_TYPE: (!!this._debug.value) ? 'Debug' : 'Release',
      ...cmakeDefines
    }, raw) : cmake.configure(root, path.join(root, buildDir), this._generator.value, {
      CMAKE_C_STANDARD: '11',
      CMAKE_CXX_STANDARD: '17',
      // CMAKE_VERBOSE_MAKEFILE: '1',
      // CMAKE_BUILD_RPATH_USE_ORIGIN: 'TRUE',
      ...((!!this._debug.value) ? { CMAKE_BUILD_TYPE: 'Debug' } : { CMAKE_BUILD_TYPE: 'Release' }),
      ...cmakeDefines
    }, raw)
    return promise
  }
}

function toCMakeArch (nodeArch) {
  switch (nodeArch) {
    case 'x64': return 'x64'
    case 'ia32': return 'Win32'
    case 'arm': return 'ARM'
    case 'arm64': return 'ARM64'
    default: throw new Error(`Unsupported arch: ${nodeArch}`) 
  }
}

module.exports = new ConfigureAction()
