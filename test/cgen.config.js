module.exports = () => ({
  "project": "hello",
  "dependencies": {
    "oid": {}
  },
  "targets": [
    {
      "name": "hello",
      "type": "exe",
      "sources": [
        "./src/main.c"
      ],
      "libs": ["libhello", "liboid"],
      "staticVCRuntime": true
    },
    {
      "name": "libhello",
      "type": "lib",
      "sources": [
        "./src/lib.c"
      ],
      "staticVCRuntime": true
    }
  ]
})
