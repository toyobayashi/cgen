const { CommandLineAction } = require('@rushstack/ts-command-line')

class CleanAction extends CommandLineAction {
  constructor () {
    super({
      actionName: 'clean',
      summary: 'Clean project output',
      documentation: 'Clean project output'
    })
  }

  onDefineParameters () {
    this._builddir = this.defineStringParameter({
      argumentName: 'BUILDDIR',
      parameterLongName: '--builddir',
      parameterShortName: '-B',
      description: 'Path to the output, must be relative to cwd',
      defaultValue: '.cgenbuild'
    })
  }

  onExecute () {
    require('../..').cleanBuild(process.cwd(), this._builddir.value)
    return Promise.resolve()
  }
}

module.exports = new CleanAction()
