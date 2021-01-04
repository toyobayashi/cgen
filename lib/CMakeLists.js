const fs = require('fs')
const { EOL } = require('os')

class CMakeLists {
  constructor (filePath) {
    Object.defineProperties(this, {
      path: {
        configurable: true,
        enumerable: true,
        writable: false,
        value: filePath
      },
      _fd: {
        configurable: true,
        enumerable: true,
        writable: false,
        value: fs.openSync(filePath, 'w+')
      }
    })
    this._head = ''
    this._include = ''
    this._body = ''
  }

  writeHead (str) {
    this._head += str
  }

  writeHeadLine (str) {
    this._head += (str + EOL)
  }

  writeInclude (str) {
    this._include += str
  }

  writeIncludeLine (str) {
    this._include += (str + EOL)
  }

  write (str) {
    this._body += str
  }

  writeLine (str) {
    this._body += (str + EOL)
  }

  close () {
    if (this._head) {
      fs.writeSync(this._fd, this._head)
      this._head = ''
    }
    if (this._include) {
      fs.writeSync(this._fd, this._include)
      this._include = ''
    }
    if (this._body) {
      fs.writeSync(this._fd, this._body)
      this._body = ''
    }
    fs.closeSync(this._fd)
  }
}

exports.CMakeLists = CMakeLists
