#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

const { generateCMakeLists } = require('..')

function loadConfig (root) {
  return JSON.parse(fs.readFileSync(path.join(root, 'cgen.json'), 'utf8'))
}

const command = process.argv[2]

if (!command || command === '-h' || command === '--help') {
  printHelp()
  process.exit(0)
}

if (command === '-v' || command === '--version' || command === '-V') {
  console.log(require('../package.json').version)
  process.exit(0)
}

if (command === 'configure') {
  const cliOptions = require('minimist')(process.argv.slice(3))
  configure(cliOptions)
}

if (command === 'build') {
  const cliOptions = require('minimist')(process.argv.slice(3))
  build(cliOptions)
}

if (command === 'clean') {
  clean()
}

if (command === 'rebuild') {
  const cliOptions = require('minimist')(process.argv.slice(3))
  clean()
  configure(cliOptions).then(() => {
    return build(cliOptions)
  }).catch(err => {
    console.error(err)
    process.exit(1)
  })
}

function printHelp () {
  console.log(`cgen`)
}

async function configure (cliOptions = {}) {
  const root = process.cwd()
  const config = loadConfig(root)
  generateCMakeLists(config, root)
  return require('./util/cmake.js').configure(root, path.join(root, 'out'), {
    ...((!!cliOptions.debug) ? { CMAKE_BUILD_TYPE: 'Debug' } : {})
  }).catch(err =>{
    console.error(err)
    process.exit(1)
  })
}

async function build (cliOptions) {
  const root = process.cwd()
  return require('./util/cmake.js').build(path.join(root, 'out'), ['--config', (!!cliOptions.debug) ? 'Debug' : 'Release']).catch(err =>{
    console.error(err)
    process.exit(1)
  })
}

function clean () {
  const root = process.cwd()
  return require('./util/cmake.js').clean(root, path.join(root, 'out'))
}
