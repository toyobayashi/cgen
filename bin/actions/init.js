const path = require('path')
const fs = require('fs')
const { CommandLineAction } = require('@rushstack/ts-command-line')

class InitAction extends CommandLineAction {
  constructor () {
    super({
      actionName: 'init',
      summary: 'Init project',
      documentation: 'Init project'
    })
  }

  onDefineParameters () {
    this._type = this.defineChoiceParameter({
      alternatives: ['dll', 'node'],
      parameterLongName: '--type',
      parameterShortName: '-t',
      description: 'Target type'
    })

    this._remainder = this.defineCommandLineRemainder({
      description: 'Directory'
    })
  }

  async onExecute () {
    if (this._remainder.values.length === 0) {
      throw new Error('Should specify project path')
    }
    const toDir = path.resolve(this._remainder.values[0])
    const info = await require('../util/cmake.js').getvsinfo()
    const vspath = info.path
    const winsdkver = info.sdk
    const ls = fs.readdirSync(path.join(vspath, 'VC/Tools/MSVC'))
    const clpath = path.join(vspath, 'VC/Tools/MSVC', ls[ls.length - 1], `bin/${process.arch === 'x64' ? 'Hostx64' : 'Hostx86'}/x64/cl.exe`)
    const data = {
      projectName: 'cgendemo',
      clPath: clpath.replace(/\\/g, '\\\\'),
      windowsSdkVersion: winsdkver,
      type: this._type.value,
      wslProjectRoot: process.platform === 'win32' ? `/mnt/${toDir.charAt(0).toLowerCase()}${toDir.substring(2).replace(/\\/g, '/')}` : ''
    }
    await copyTemplate('package.ejs', 'package.json', toDir, data)
    await copyTemplate('cgen.config.ejs', 'cgen.config.js', toDir, data)
    await copyTemplate('src/lib.c', 'src/lib.c', toDir, data)
    await copyTemplate('src/lib.h', 'src/lib.h', toDir, data)
    if (this._type.value === 'node') {
      await copyTemplate('src/addon.c', 'src/addon.c', toDir, data)
    } else {
      await copyTemplate('src/main.c', 'src/main.c', toDir, data)
    }
    await copyTemplate('.vscode/c_cpp_properties.ejs', '.vscode/c_cpp_properties.json', toDir, data)
    await copyTemplate('.vscode/launch.ejs', '.vscode/launch.json', toDir, data)
    await copyTemplate('.vscode/tasks.json', '.vscode/tasks.json', toDir, data)
  }
}

async function copyTemplate (file, toName, toDir, data) {
  const fullpath = path.join(__dirname, '../../template', file)
  const topath = path.join(toDir, toName)
  fs.mkdirSync(path.dirname(topath), { recursive: true })
  if (path.extname(fullpath) === '.ejs') {
    const code = await require('ejs').renderFile(fullpath, data)
    fs.writeFileSync(topath, code, 'utf8')
  } else {
    fs.copyFileSync(fullpath, topath)
  }
}

module.exports = new InitAction()
