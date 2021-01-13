const fs = require('fs')

async function emwrap (filePath, libName, exportFile, minify) {
  let code = fs.readFileSync(filePath, 'utf8')

  code = code.replace(/\s*if\s*\(typeof document\s*!==\s*['"]undefined['"]\s*&&\s*document\.currentScript\)/g, '')
  code = code.replace(/document\.currentScript\.src/g, '__cgen_dcs__')

  const pre = `
(function (root, factory) {
  var nativeRequire;

  if (typeof __webpack_public_path__ !== 'undefined') {
    nativeRequire = (function () {
      return typeof __non_webpack_require__ !== 'undefined' ? __non_webpack_require__ : undefined;
    })();
  } else {
    nativeRequire = (function () {
      return typeof __webpack_public_path__ !== 'undefined' ? (typeof __non_webpack_require__ !== 'undefined' ? __non_webpack_require__ : undefined) : (typeof require !== 'undefined' ? require : undefined);
    })();
  }

  var name = '${libName || ''}';
  var _process = root && root.process;
  if(typeof exports === 'object' && typeof module === 'object') {
    module.exports = factory(nativeRequire, _process);
  } else if(typeof define === 'function' && define.amd) {
    define([], function () {
      return factory(nativeRequire, _process);
    });
  } else if(typeof exports === 'object') {
    exports[name] = factory(nativeRequire, _process);
  } else {
    root[name] = factory(nativeRequire, _process);
  }
})((function (defaultValue) {
  var g;
  g = (function () { return this; })();

  try {
    g = g || new Function('return this')();
  } catch (_) {
    if (typeof globalThis !== 'undefined') return globalThis;
    if (typeof __webpack_public_path__ === 'undefined') {
      if (typeof global !== 'undefined') return global;
    }
    if (typeof window !== 'undefined') return window;
    if (typeof self !== 'undefined') return self;
  }

  return g || defaultValue;
})(this), function (require, process, module) {
  var __cgen_dcs__ = '';
  try {
    __cgen_dcs__ = document.currentScript.src;
  } catch (_) {}
  function c (Module) {
`

  const post = `
    return Module;
  }

  return (function (onExports) {
    var Module = null;
    var exports = {};
    try {
      Object.defineProperty(exports, '__esModule', { value: true });
    } catch (_) {
      exports.__esModule = true;
    }
    var promise = null;
    Object.defineProperty(exports, 'default', {
      enumerable: true,
      value: function init (mod) {
        if (Module) return Promise.resolve(Module);
        if (promise) return promise;
        var p = promise = new Promise(function (resolve, reject) {
          mod = mod || {};

          var hasOnAbort = 'onAbort' in mod;
          var userOnAbort = mod.onAbort;
          var hasOnRuntimeInitialized = 'onRuntimeInitialized' in mod;
          var userOnRuntimeInitialized = mod.onRuntimeInitialized;
          var reset = function () {
            if (hasOnAbort) {
              mod.onAbort = userOnAbort;
            } else {
              delete mod.onAbort;
            }

            if (hasOnRuntimeInitialized) {
              mod.onRuntimeInitialized = userOnRuntimeInitialized;
            } else {
              delete mod.onRuntimeInitialized;
            }
          };

          mod.onAbort = function (m) {
            reject(new Error(m));
            reset();
            if (typeof mod.onAbort === 'function') {
              mod.onAbort(m);
            }
          };

          mod.onRuntimeInitialized = function () {
            reset();
            if (typeof mod.onRuntimeInitialized === 'function') {
              try {
                mod.onRuntimeInitialized();
              } catch (err) {
                reject(err);
                return;
              }
            }
            onExports(exports, mod);
            Module = mod;
            promise = null;
            resolve(Module);
          };

          c(mod);
        }).catch(function (err) {
          Module = null;
          promise = null;
          return Promise.reject(err);
        });

        return p;
      }
    });

    if (typeof Symbol !== 'undefined' && Symbol.toStringTag) {
      try {
        Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
      } catch (_) {}
    }

    return exports;
  })(function (exports, Module) {
${exportFile ? fs.readFileSync(exportFile, 'utf8') : ''}
  });
});
`
  code = pre + code + post
  if (minify) {
    fs.writeFileSync(filePath, (await require('terser').minify(code, { compress: true, mangle: true })).code, 'utf8')
  } else {
    fs.writeFileSync(filePath, code, 'utf8')
  }
}

exports.emwrap = emwrap
