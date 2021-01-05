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

async function configure (root, buildDir, defines = {}, configureArgs = []) {
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

async function emConfigure (root, buildDir, defines = {}, configureArgs = []) {
  fs.mkdirSync(buildDir, { recursive: true })

  if (process.platform === 'win32') {
    let emcmake = 'emcmake.bat'
    if (!which(emcmake)) {
      if (process.env.EMSDK) {
        const fullpath = path.join(process.env.EMSDK, 'upstream/emscripten/emcmake.bat')
        if (fs.existsSync(fullpath)) {
          emcmake = fullpath
        } else {
          throw new Error('emcmake.bat is not found')
        }
      } else {
        throw new Error('emcmake.bat is not found')
      }
    }
    const nmakePath = which('nmake')
    defines.CMAKE_MAKE_PROGRAM = nmakePath ? 'nmake' : 'make'
    // defines.CMAKE_VERBOSE_MAKEFILE = 'ON'
    const definesArgs = Object.keys(defines).map(k => `-D${k}=${defines[k]}`)
    const cmakeArgs = ['cmake', 
      ...definesArgs,
      ...configureArgs,
      '-G', nmakePath ? 'NMake Makefiles' : 'MinGW Makefiles',
      `-H.`,
      '-B',
      buildDir
    ]
    await spawn(emcmake, cmakeArgs, root)
  } else {
    let emcmake = 'emcmake'
    if (!which(emcmake)) {
      if (process.env.EMSDK) {
        const fullpath = path.join(process.env.EMSDK, 'upstream/emscripten/emcmake')
        if (fs.existsSync(fullpath)) {
          emcmake = fullpath
        } else {
          throw new Error('emcmake is not found')
        }
      } else {
        throw new Error('emcmake is not found')
      }
    }
    const definesArgs = Object.keys(defines).map(k => `-D${k}=${defines[k]}`)
    const cmakeArgs = ['cmake', 
      ...definesArgs,
      ...configureArgs,
      '-G', 'Unix Makefiles',
      `-H.`,
      '-B',
      buildDir
    ]
    await spawn(emcmake, cmakeArgs, root)
  }
}

async function build (buildDir, buildArgs = []) {
  fs.mkdirSync(buildDir, { recursive: true })

  await spawn('cmake', ['--build', buildDir, ...buildArgs])
}

module.exports = {
  configure,
  emConfigure,
  build,
  buildDir: '.cgenbuild'
}
