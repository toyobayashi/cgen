/// <reference types="node" />

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
  wrapScript?: string;

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
  /** `true` if run `cgen <action> --emscripten` */
  isEmscripten?: boolean;
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
/**
 * Wrap JavaScript glue code generated by emscripten for supporting webpack 
 * @param filePath - JS glue code path
 * @param libName - Global library name export to `window` object
 * @param exportFile - Script path that include additional custom export
 * @param minify - Whether minify the wrapped code
 */
export declare function emwrap (filePath: string, libName: string, exportFile: string, minify: boolean): Promise<void>;
