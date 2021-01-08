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
      parameterShortName: '-s',
      description: 'Node sdk root directory',
      defaultValue: process.env.npm_config_devdir || require('env-paths')('node-gyp', { suffix: '' }).cache,
      environmentVariable: 'NPM_CONFIG_DEVDIR'
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

    this._builddir = this.defineStringParameter({
      argumentName: 'BUILDDIR',
      parameterLongName: '--builddir',
      parameterShortName: '-B',
      description: 'Path to the output, must be relative to cwd',
      defaultValue: '.cgenbuild'
    })
  }

  onExecute () {
    const { loadConfig, generateCMakeLists } = require('../..')
    const buildDir = this._builddir.value
    const root = process.cwd()
    const config = loadConfig(root, {}, {
      parentRootDir: null,
      isClean: false,
      isDebug: !!this._debug.value
    })

    const defines = Object.create(null)
    this._defines.values.forEach((s) => {
      const i = s.indexOf('=')
      let k, v
      if (i === -1) {
        k = s
        v = ''
      } else {
        k = s.substring(0, i)
        v = s.substring(i + 1)
      }
      defines[k] = v
    })

    generateCMakeLists(config, root, {}, !!this._emscripten.value, null, {
      target: this._target.value,
      arch: this._arch.value,
      devdir: this._devdir.value,
      nodedir: this._nodedir.value
    }, defines, !!this._debug.value)
    const cmake = require('../util/cmake.js')
    const promise = this._emscripten.value ? cmake.emConfigure(root, path.join(root, buildDir), {
      CMAKE_C_STANDARD: '99',
      CMAKE_CXX_STANDARD: '11',
      CMAKE_BUILD_TYPE: (!!this._debug.value) ? 'Debug' : 'Release'
    }) : cmake.configure(root, path.join(root, buildDir), {
      CMAKE_C_STANDARD: '99',
      CMAKE_CXX_STANDARD: '11',
      ...((!!this._debug.value) ? { CMAKE_BUILD_TYPE: 'Debug' } : { CMAKE_BUILD_TYPE: 'Release' })
    }, process.platform === 'win32' ? [
      '-A', toCMakeArch(this._arch.value)
    ] : [])
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
