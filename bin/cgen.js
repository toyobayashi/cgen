#!/usr/bin/env node

const command = process.argv[2]

if (command === '-v' || command === '--version' || command === '-V') {
  console.log(require('../package.json').version)
  process.exit(0)
}

const { DynamicCommandLineParser } = require('@rushstack/ts-command-line')
const initAction = require('./actions/init.js')
const configureAction = require('./actions/configure.js')
const buildAction = require('./actions/build.js')
const rebuildAction = require('./actions/rebuild.js')
const cleanAction = require('./actions/clean.js')

const commandLineParser = new DynamicCommandLineParser({
  toolFilename: 'cgen',
  toolDescription: `[v${require('../package.json').version}] Node.js CLI tool for generate C/C++ project`
})

commandLineParser.addAction(initAction)
commandLineParser.addAction(configureAction)
commandLineParser.addAction(buildAction)
commandLineParser.addAction(rebuildAction)
commandLineParser.addAction(cleanAction)

commandLineParser.executeWithoutErrorHandling().then(() => {
  // const action = commandLineParser.selectedAction
  // if (!action) {
  //   console.error('Exit: 1')
  //   process.exit(1)
  // }
}).catch(err => {
  console.error(err)
  console.error('Exit: 1')
  process.exit(1)
})
