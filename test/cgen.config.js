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
        "./src/main.c"
      ],
      "libs": ["add", "oid"],
      "staticVCRuntime": true
    }
  ]
})
