const fs = require('fs')
const path = require('path')

const { which } = require('./which.js')
const { spawn } = require('./spawn.js')

function checkCMake () {
  if (!which('cmake')) {
    throw new Error('cmake is not found')
  }
}

checkCMake()

async function rebuild (root, buildDir, defines, configureArgs = [], buildArgs = []) {
  if (typeof fs.rmSync === 'function') {
    fs.rmSync(buildDir, { recursive: true, force: true })
  } else {
    fs.rmdirSync(buildDir, { recursive: true })
  }
  const cmklists = path.join(root, 'CMakeLists.txt')
  if (fs.existsSync(cmklists)) fs.unlinkSync(cmklists)
  await configure(root, buildDir, defines, configureArgs)
  await build(buildDir, buildArgs)
}

function clean (root, buildDir) {
  if (typeof fs.rmSync === 'function') {
    fs.rmSync(buildDir, { recursive: true, force: true })
  } else {
    fs.rmdirSync(buildDir, { recursive: true })
  }
  const cmklists = path.join(root, 'CMakeLists.txt')
  if (fs.existsSync(cmklists)) fs.unlinkSync(cmklists)
}

async function configure (root, buildDir, defines, configureArgs = []) {
  fs.mkdirSync(buildDir, { recursive: true })

  const definesArgs = Object.keys(defines).map(k => `-D${k}=${defines[k]}`)
  const cmakeArgs = [ 
    ...definesArgs,
    ...configureArgs,
    `-H.`,
    '-B',
    buildDir
  ]
  // await spawn('emcmake', cmakeArgs, buildDir)
  await spawn('cmake', cmakeArgs, root)
}

async function build (buildDir, buildArgs = []) {
  fs.mkdirSync(buildDir, { recursive: true })

  await spawn('cmake', ['--build', buildDir, ...buildArgs])
}

module.exports = {
  configure,
  build,
  clean,
  rebuild
}
