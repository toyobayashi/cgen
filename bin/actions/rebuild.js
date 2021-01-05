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
    configureAction.onDefineParameters.call(this)
  }

  async onExecute () {
    configureAction._debug = this._debug
    configureAction._emscripten = this._emscripten
    configureAction._target = this._target
    configureAction._arch = this._arch
    configureAction._devdir = this._devdir
    configureAction._nodedir = this._nodedir
    buildAction._debug = this._debug
    await cleanAction.onExecute()
    await configureAction.onExecute()
    await buildAction.onExecute()
  }
}

module.exports = new RebuildAction()
