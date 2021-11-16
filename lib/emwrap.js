const fs = require('fs')

async function emwrap (filePath, options) {
  if (!filePath || typeof filePath !== 'string') {
    throw new TypeError('missing input file')
  }
  const { wrap, wrapAndMinify } = require('@tybys/emwrap')
  options = options || {}
  options.output = options.output || filePath
  const minify = typeof options.minify === 'boolean' ? options.minify : false
  const code = minify
    ? (await wrapAndMinify(fs.readFileSync(filePath, 'utf8'), options))
    : wrap(fs.readFileSync(filePath, 'utf8'), options)

  await fs.promises.writeFile(options.output, code, 'utf8')
}

exports.emwrap = emwrap
