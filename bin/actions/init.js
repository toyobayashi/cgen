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

    this._vscodeSettingsOnly = this.defineFlagParameter({
      parameterLongName: '--vscode',
      parameterShortName: '-c',
      description: 'Generate vscode settings only'
    }) 

    this._remainder = this.defineCommandLineRemainder({
      description: 'Directory'
    })
  }

  async onExecute () {
    if (this._vscodeSettingsOnly.value) {
      const toDir = path.resolve('.')
      const data = await getTemplateData(toDir, this._type.value, false)
      await copyTemplate('.vscode/c_cpp_properties.ejs', '.vscode/c_cpp_properties.json', toDir, data)
      await copyTemplate('.vscode/launch.ejs', '.vscode/launch.json', toDir, data)
      await copyTemplate('.vscode/tasks.json', '.vscode/tasks.json', toDir, data)
      return
    }
    if (this._remainder.values.length === 0) {
      throw new Error('Should specify project path')
    }
    const toDir = path.resolve(this._remainder.values[0])
    if (fs.existsSync(toDir)) {
      throw new Error(`Path exists: ${toDir}`)
    }
    const data = await getTemplateData(toDir, this._type.value, true)
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

async function getTemplateData (toDir, type, checkvs) {
  const data = {
    projectName: path.basename(toDir),
    type: type,
    clPath: '${env:VCToolsInstallDir}bin\\\\Host${env:VSCMD_ARG_HOST_ARCH}\\\\${env:VSCMD_ARG_TGT_ARCH}\\\\cl.exe',
    windowsSdkVersion: '${env:UCRTVersion}',
    wslProjectRoot: process.platform === 'win32' ? `/mnt/${toDir.charAt(0).toLowerCase()}${toDir.substring(2).replace(/\\/g, '/')}` : ''
  }
  if (process.platform === 'win32') {
    let info
    try {
      info = await require('../util/cmake.js').getvsinfo()
    } catch (err) {
      if (checkvs) {
        throw err
      } else {
        return data
      }
    }
    const vspath = info.path
    const winsdkver = info.sdk
    const ls = fs.readdirSync(path.join(vspath, 'VC/Tools/MSVC'))
    const clpath = path.join(vspath, 'VC/Tools/MSVC', ls[ls.length - 1], `bin/${process.arch === 'x64' ? 'Hostx64' : 'Hostx86'}/x64/cl.exe`)
    data.clPath = clpath.replace(/\\/g, '\\\\')
    data.windowsSdkVersion = winsdkver
  }
  return data
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
