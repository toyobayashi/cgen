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
  }

  onExecute () {
    const { loadConfig, generateCMakeLists } = require('../..')
    const buildDir = require('../util/cmake.js').buildDir
    const root = process.cwd()
    const config = loadConfig(root, {}, null, false)
    generateCMakeLists(config, root, {}, !!this._emscripten.value, null)
    const cmake = require('../util/cmake.js')
    const promise = this._emscripten.value ? cmake.emConfigure(root, path.join(root, buildDir), {
      CMAKE_BUILD_TYPE: (!!this._debug.value) ? 'Debug' : 'Release'
    }) : cmake.configure(root, path.join(root, buildDir), {
      ...((!!this._debug.value) ? { CMAKE_BUILD_TYPE: 'Debug' } : { CMAKE_BUILD_TYPE: 'Release' })
    })
    return promise
  }
}

module.exports = new ConfigureAction()
