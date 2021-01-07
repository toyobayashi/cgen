const addon = process.platform === 'win32' ? require('./.cgenbuild/Release/test.node') : require('./.cgenbuild/test.node')
const addon2 = process.platform === 'win32' ? require('./.cgenbuild/Release/test2.node') : require('./.cgenbuild/test2.node')
addon.main()
addon2.main()
