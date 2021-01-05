const { CommandLineAction } = require('@rushstack/ts-command-line')
const cleanAction = require('./clean.js')
const configureAction = require('./configure.js')
const buildAction = require('./build.js')

class RebuildAction extends CommandLineAction {
  constructor () {
    super({
      actionName: 'rebuild',
      summary: 'Rebuild project',
      documentation: 'Rebuild project'
    })
  }

  onDefineParameters () {
    this._debug = this.defineFlagParameter({
      parameterLongName: '--debug',
      parameterShortName: '-d',
      description: 'Set debug mode'
    })

    this._emscripten = this.defineFlagParameter({
      parameterLongName: '--emscripten',
      parameterShortName: '-e',
      description: 'Use emscripten tool chain'
    })
  }

  async onExecute () {
    configureAction._debug = this._debug
    configureAction._emscripten = this._emscripten
    buildAction._debug = this._debug
    await cleanAction.onExecute()
    await configureAction.onExecute()
    await buildAction.onExecute()
  }
}

module.exports = new RebuildAction()
