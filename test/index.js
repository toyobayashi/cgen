const addon = process.platform === 'win32' ? require('./.cgenbuild/Release/test.node') : require('./.cgenbuild/test.node')
addon.main()
