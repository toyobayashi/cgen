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
  }

  onExecute () {
    const root = process.cwd()
    const buildDir = require('../util/cmake.js').buildDir
    return require('../util/cmake.js').build(path.join(root, buildDir), ['--config', (!!this._debug.value) ? 'Debug' : 'Release'])
  }
}

module.exports = new BuildAction()
