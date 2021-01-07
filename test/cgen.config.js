module.exports = () => ({
  "project": "hello",
  "dependencies": {
    "oid": {
      "baz": "foo"
    },
    "add": {}
  },
  "targets": [
    {
      "name": "hello",
      "type": "exe",
      "sources": [
        "./src/main.c",
        "./src/_main.c"
      ],
      "libs": ["add", "oid"],
      "staticVCRuntime": true
    },
    {
      "name": "test",
      "type": "node",
      "sources": [
        "./src/addon.c",
        "./src/_main.c"
      ],
      "libs": ["add", "oid"]
    },
    {
      "name": "test2",
      "type": "node",
      "sources": [
        "./src/addon.cpp",
      ],
      "nodeAddonApi": true,
      "libs": ["add"]
    }
  ]
})
