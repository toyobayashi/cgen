# cgen

Node.js CLI tool based on CMake for generating C/C++ project.

## Requirements

* Node.js >= 12.10

* CMake >= 3.9

* Non-Windows: gcc / clang, gdb / lldb, make

* Windows: Visual Studio 2017+ & [Desktop development with C++] workload

* Building webassembly

  * emsdk
  
  * Emscripten 2.x

    * `$EMSDK` system environment variable set to emsdk root path

    * `$EMSDK/upstream/emscripten` in `$PATH`
  
  * make / nmake

## Usage

Quick start:

```bash
npm install -g @tybys/cgen
cgen init demo
cd ./demo
cgen rebuild
```

Install in local project:

```bash
npm install -D @tybys/cgen
# Additionally if use TypeScript
# npm install -D @types/node
```

Configuration example:

```js
// cgen.config.js

// for TypeScript intellisense
// const { defineFunctionConfig, defineObjectConfig } = require('@tybys/cgen')
// module.exports = defineObjectConfig({ ... })
// module.exports = defineFunctionConfig(function (options, ctx) { ... })

module.exports = function (options, { isDebug }) {
  return {
    project: 'example',
    targets: [
      {
        name: 'mylib',
        type: !!(options.DLL) ? 'dll' : 'lib',
        sources: [
          './src/mysource.c'
        ],
        defines: [
          ...(!!(options.DLL) ? ['MYLIB_BUILD_DLL'] : [])
        ],
        publicIncludePaths: ['./include'],
        staticVCRuntime: !!(options.MT)
      },
      {
        name: 'myexe',
        type: 'exe',
        sources: [
          './src/main.c'
        ],
        libs: ['mylib'],
        staticVCRuntime: !!(options.MT)
      }
    ]
  }
}
```

Build command example: `cgen rebuild -sDLL -sMT --debug`

WebAssembly example:

```js
// cgen.config.js
module.exports = function (_options, { isDebug }) {
  const debugFlags = [
    '-sDISABLE_EXCEPTION_CATCHING=0',
    '-sSAFE_HEAP=1'
  ]

  const commonFlags = [
    '--bind',
    // '-sDYNCALLS=1', v2.0.13+ if you need dynCall_xxx()
    // '-sERROR_ON_UNDEFINED_SYMBOLS=0', if add js function to imports.env
    '-sALLOW_MEMORY_GROWTH=1',
    ...(isDebug ? debugFlags : [])
  ]

  return {
    project: 'example',
    targets: [
      {
        name: 'mywasm',
        type: 'exe',
        sources: [
          './src/*.cpp'
        ],
        emwrap: { // compatible webpack
          script: './export.js'
        }
        compileOptions: [...commonFlags],
        linkOptions: [...commonFlags]
      }
    ]
  }
}
```

```js
/**
 * export.js
 */

exports.myfunction = function () {
  return Module.myfunction.apply(Module, arguments)
}
```

Build command: `cgen rebuild --emscripten` or `cgen rebuild -e`

Use webassembly:

```html
<script src="./.cgenbuild/mywasm.js"></script>
<script>
(function () {
  window.mywasm.default().then(function (emctx) {
    // emscriptenModule === emctx.Module
    emctx.Module.myfunction();
  });

  // or use custom instatiating to add js function to native world
  var emscriptenModule = {
    // Custom instantiating
    instantiateWasm: function (imports, receiveInstance) {
      fetch('mywasm.wasm', {
        credentials: 'same-origin'
      })
        .then(function (res) {
          return res.arrayBuffer();
        })
        .then(function (arrayBuffer) {
          // imports.env.js_fn = xxx
          return WebAssembly.instantiate(arrayBuffer, imports);
        })
        .then(({ instance, module }) => {
          receiveInstance(instance, module);
        });
      return {};
    }
  };
  window.mywasm.default(emscriptenModule).then(function (emctx) {
    // emscriptenModule === emctx.Module
    emctx.Module.myfunction();
  });
})();
</script>
```

or with bundler

```js
import init from './.cgenbuild/mywasm.js'
// const init = require('./.cgenbuild/mywasm.js').default
init().then((emctx) => { emctx.Module.myfunction() })
```

or

```js
import init, { myfunction } from './.cgenbuild/mywasm.js'

// typeof myfunction === 'undefined'
init().then((emctx) => {
  // typeof myfunction === 'function'
  // myfunction === emctx.Module.myfunction
  emctx.myfunction()
})
```

See more help: `cgen -h` or `cgen <command> -h`

## TypeScript typings

```ts
/// <reference types="node" />

declare interface WrapOptions {
  module?: 'umd' | 'esm' | 'cjs' | 'mjs'
  /** Library name for UMD module */
  name?: string
  /** Wrap script */
  script?: string
  /** Extra runtime variables to be added on init() promise result */
  exports?: string[]
}

/** Build target options */
export declare interface Target {
  /** Target name */
  name: string;

  /** Build target type */
  type: 'exe' | 'lib' | 'dll' | 'node' | 'interface';

  /** Glob patterns */
  sources?: string[];

  /** Whether to use node-addon-api */
  nodeAddonApi?: boolean;

  /** Defines NAPI_VERSION */
  napiVersion?: string;

  /** set_target_properties()  */
  properties?: Record<string, string>;

  /** target_link_options(${name}, PRIVATE, ...) */
  linkOptions?: string[];

  /** target_link_options(${name}, INTERFACE, ...) */
  interfaceLinkOptions?: string[];

  /** target_link_options(${name}, PUBLIC, ...) */
  publicLinkOptions?: string[];

  /** target_compile_options(${name}, PRIVATE, ...) */
  compileOptions?: string[];

  /** target_compile_options(${name}, INTERFACE, ...) */
  interfaceCompileOptions?: string[];

  /** target_compile_options(${name}, PUBLIC, ...) */
  publicCompileOptions?: string[];

  /** target_compile_definitions(${name}, PRIVATE, ...) */
  defines?: string[];

  /** target_compile_definitions(${name}, INTERFACE, ...) */
  interfaceDefines?: string[];

  /** target_compile_definitions(${name}, PUBLIC, ...) */
  publicDefines?: string[];

  /** target_include_directories(${name}, PRIVATE, ...) */
  includePaths?: string[];

  /** target_include_directories(${name}, INTERFACE, ...) */
  interfaceIncludePaths?: string[];

  /** target_include_directories(${name}, PUBLIC, ...) */
  publicIncludePaths?: string[];

  /** target_link_directories(${name}, PRIVATE, ...) */
  libPaths?: string[];

  /** target_link_directories(${name}, INTERFACE, ...) */
  interfaceLibPaths?: string[];

  /** target_link_directories(${name}, PUBLIC, ...) */
  publicLibPaths?: string[];

  /** target_link_libraries(${name}, ...) */
  libs?: string[];

  /** Use VC /MT for release while /MTd for debug */
  staticVCRuntime?: boolean;

  /** Wrap JavaScript glue code generated by emscripten for supporting webpack */
  emwrap?: WrapOptions

  /** Windows specific options */
  windows?: Partial<Omit<Target, 'windows' | 'linux' | 'macos'>>;

  /** Linux specific options */
  linux?: Partial<Omit<Target, 'windows' | 'linux' | 'macos'>>;

  /** macOS specific options */
  macos?: Partial<Omit<Target, 'windows' | 'linux' | 'macos'>>;
}

/** Build configuration */
export declare interface Configuration {
  /** Project name */
  project: string;
  /** Project targets */
  targets: Target[];
  /** Minimum required cmake version */
  minimumVersion?: string;
  /** add_compile_definitions */
  defines?: string[];
  /** add_compile_options */
  compileOptions?: string[];
  /** include_directories */
  includePaths?: string[];
  /** link_directories */
  libPaths?: string[];
  /** add_link_options */
  linkOptions?: string[];
  /** The Node.js script run after build */
  postScript?: string;
  /** Replace `%VAR%` in configuration */
  variables?: Record<string, string | number | boolean>;
  /** Target default options */
  targetDefault?: Partial<Omit<Target, 'name' | 'type'>>;
  /** Generate subdir CMakeLists.txt and add_subdirectory() */
  dependencies?: Record<string, Record<string, any>>
}

/** Building context */
export declare interface BuildingContext {
  /** Parent project root directory */
  parentRootDir: string | null;
  /** `true` if run `cgen clean` */
  isClean: boolean;
  /** `true` if run `cgen <action> --debug` */
  isDebug: boolean;
}

export declare type FunctionConfiguration<O = any> = (options: O, ctx: BuildingContext) => Configuration;

/** Node.js related configuration */
export declare interface NodeConfig {
  /** @see [node-gyp](https://www.npmjs.com/package/node-gyp#command-options) */
  target?: string;
  /** @see [node-gyp](https://www.npmjs.com/package/node-gyp#command-options) */
  arch?: string;
  /** @see [node-gyp](https://www.npmjs.com/package/node-gyp#command-options) */
  devdir?: string;
  /** @see [node-gyp](https://www.npmjs.com/package/node-gyp#command-options) */
  nodedir?: string;
}

/** @internal */
export declare interface GenerateOptions {
  config?: Configuration;
  configPath?: string;
  globalOptions?: Record<string, any>;
  options?: Record<string, any>;
  isEmscripten?: boolean;
  parentPath?: string | null;
  nodeConfig?: NodeConfig;
  defines?: Record<string, string>;
  isDebug?: boolean;
}

export declare interface EmwrapOptions extends WrapOptions {
  minify?: boolean
  output?: string
}

/** @internal */
export declare function generateCMakeLists (options?: GenerateOptions): void;
/** @internal */
export declare function getCMakeInclude (key: 'vcruntime' | 'require' | 'embuild' | 'napi'): string;
/** @internal */
export declare function findProjectRoot (start?: string): string;
/** @internal */
export declare function resolve (dirname: string, requireFunction: NodeRequire, request: string): string;
/** @internal */
export declare function loadConfig (root: string, options: Record<string, any>, ctx: BuildingContext): Configuration;
/** @internal */
export declare function cleanBuild (configRoot: string, buildDirName: string, parentRootDir?: string | null): void;
/** Do nothing, just for TypeScript intellisense */
export declare function defineObjectConfig (config: Configuration): Configuration;
/** Do nothing, just for TypeScript intellisense */
export declare function defineFunctionConfig<O = any> (config: FunctionConfiguration<O>): FunctionConfiguration<O>;
/** Wrap JavaScript glue code generated by emscripten for supporting webpack */
export declare function emwrap (filePath: string, options?: EmwrapOptions): Promise<void>;
```
