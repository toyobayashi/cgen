const path = require('path')
const { CommandLineAction } = require('@rushstack/ts-command-line')

class BuildAction extends CommandLineAction {
  constructor () {
    super({
      actionName: 'build',
      summary: 'Build project',
      documentation: 'Build project'
    })
  }

  onDefineParameters () {
    this._debug = this.defineFlagParameter({
      parameterLongName: '--debug',
      parameterShortName: '-d',
      description: 'Set debug config'
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
    const root = process.cwd()
    return require('../util/cmake.js').build(path.join(root, this._builddir.value), ['--config', (!!this._debug.value) ? 'Debug' : 'Release'])
  }
}

module.exports = new BuildAction()
