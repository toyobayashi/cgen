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

    this._builddirOnly = this.defineFlagParameter({
      argumentName: 'BUILDIR_ONLY',
      parameterLongName: '--builddir-only',
      description: 'Only clean the build directory, ignore generated CMakeLists.txt'
    })
  }

  onExecute () {
    require('../..').cleanBuild(process.cwd(), {
      buildDirName: this._builddir.value,
      buildDirOnly: Boolean(this._builddirOnly.value)
    })
    return Promise.resolve()
  }
}

module.exports = new CleanAction()
