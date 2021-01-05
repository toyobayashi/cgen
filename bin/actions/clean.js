const { CommandLineAction } = require('@rushstack/ts-command-line')

class CleanAction extends CommandLineAction {
  constructor () {
    super({
      actionName: 'clean',
      summary: 'Clean project output',
      documentation: 'Clean project output'
    })
  }

  onDefineParameters () {}

  onExecute () {
    require('../..').cleanBuild(process.cwd(), require('../util/cmake.js').buildDir)
    return Promise.resolve()
  }
}

module.exports = new CleanAction()
