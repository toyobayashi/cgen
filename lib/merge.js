function platformTarget (target, isEmscripten) {
  switch (process.platform) {
    case 'win32': return (isEmscripten || (target.type === 'interface')) ? null : {
      compileOptions: ['/source-charset:utf-8'],
      defines: ['_CRT_SECURE_NO_WARNINGS', 'UNICODE', '_UNICODE'],
      ...(target.windows || {})
    }
    case 'linux': return target.linux || null
    case 'darwin': return target.macos || null
    default: return null
  }
}

function mergeValue (target, ostarget, key) {
  if (Object.prototype.hasOwnProperty.call(ostarget, key)) {
    target[key] = ostarget[key]
  }
}

function mergeArray (target, ostarget, key) {
  if (Object.prototype.hasOwnProperty.call(ostarget, key)) {
    target[key] = Array.from(new Set([...(target[key] || []), ...(ostarget[key] || [])]))
  }
}

function mergeObject (target, ostarget, key) {
  if (Object.prototype.hasOwnProperty.call(ostarget, key)) {
    target[key] = {
      ...(target[key] || {}),
      ...(ostarget[key] || {})
    }
  }
}

function mergeOSTarget (target, ostarget) {
  mergeValue(target, ostarget, 'name')
  mergeValue(target, ostarget, 'type')
  mergeArray(target, ostarget, 'sources')

  mergeValue(target, ostarget, 'nodeAddonApi')
  mergeValue(target, ostarget, 'napiVersion')

  mergeObject(target, ostarget, 'properties')

  mergeArray(target, ostarget, 'linkOptions')
  mergeArray(target, ostarget, 'interfaceLinkOptions')
  mergeArray(target, ostarget, 'publicLinkOptions')
  
  mergeArray(target, ostarget, 'compileOptions')
  mergeArray(target, ostarget, 'interfaceCompileOptions')
  mergeArray(target, ostarget, 'publicCompileOptions')

  mergeArray(target, ostarget, 'defines')
  mergeArray(target, ostarget, 'interfaceDefines')
  mergeArray(target, ostarget, 'publicDefines')

  mergeArray(target, ostarget, 'includePaths')
  mergeArray(target, ostarget, 'interfaceIncludePaths')
  mergeArray(target, ostarget, 'publicIncludePaths')

  mergeArray(target, ostarget, 'libPaths')
  mergeArray(target, ostarget, 'interfaceLibPaths')
  mergeArray(target, ostarget, 'publicLibPaths')

  mergeArray(target, ostarget, 'libs')
  mergeValue(target, ostarget, 'staticVCRuntime')
  mergeValue(target, ostarget, 'wrapScript')

  return target
}

function mergeDefaultTarget (target, targetDefault, isEmscripten) {
  mergeOSTarget(targetDefault, platformTarget(targetDefault, isEmscripten))

  mergeArray(target, targetDefault, 'sources')
  mergeValue(target, targetDefault, 'nodeAddonApi')
  mergeValue(target, targetDefault, 'napiVersion')

  mergeObject(target, targetDefault, 'properties')

  mergeArray(target, targetDefault, 'linkOptions')
  mergeArray(target, targetDefault, 'interfaceLinkOptions')
  mergeArray(target, targetDefault, 'publicLinkOptions')
  
  mergeArray(target, targetDefault, 'compileOptions')
  mergeArray(target, targetDefault, 'interfaceCompileOptions')
  mergeArray(target, targetDefault, 'publicCompileOptions')

  mergeArray(target, targetDefault, 'defines')
  mergeArray(target, targetDefault, 'interfaceDefines')
  mergeArray(target, targetDefault, 'publicDefines')

  mergeArray(target, targetDefault, 'includePaths')
  mergeArray(target, targetDefault, 'interfaceIncludePaths')
  mergeArray(target, targetDefault, 'publicIncludePaths')

  mergeArray(target, targetDefault, 'libPaths')
  mergeArray(target, targetDefault, 'interfaceLibPaths')
  mergeArray(target, targetDefault, 'publicLibPaths')
  mergeArray(target, targetDefault, 'libs')
  mergeValue(target, targetDefault, 'staticVCRuntime')
  mergeValue(target, targetDefault, 'wrapScript')

  return target
}

exports.platformTarget = platformTarget
exports.mergeOSTarget = mergeOSTarget
exports.mergeDefaultTarget = mergeDefaultTarget
