/// <reference types="node" />

export declare interface Target {
  name: string;
  type: 'exe' | 'lib' | 'dll' | 'node';
  sources: string[];

  cStandard?: string;
  cxxStandard?: string;

  linkOptions?: string[];
  interfaceLinkOptions?: string[];
  publicLinkOptions?: string[];

  compileOptions?: string[];
  interfaceCompileOptions?: string[];
  publicCompileOptions?: string[];

  defines?: string[];
  interfaceDefines?: string[];
  publicDefines?: string[];

  includePaths?: string[];
  interfaceIncludePaths?: string[];
  publicIncludePaths?: string[];

  libPaths?: string[];
  interfaceLibPaths?: string[];
  publicLibPaths?: string[];

  libs?: string[];

  staticVCRuntime?: boolean;

  windows?: Partial<Omit<Target, 'windows' | 'linux' | 'macos'>>;
  linux?: Partial<Omit<Target, 'windows' | 'linux' | 'macos'>>;
  macos?: Partial<Omit<Target, 'windows' | 'linux' | 'macos'>>;
}

export declare interface Configuration {
  project: string;
  targets: Target[];
  minimumVersion?: string;
  postScript?: string;
  variables?: Record<string, string | number | boolean>;
  targetDefault?: Partial<Omit<Target, 'name' | 'type'>>;
  dependencies?: Record<string, Record<string, any>>
}

export declare type FunctionConfiguration<O = any> = (options: O, parentRootDir: string, isClean: boolean) => Configuration;

export declare interface NodeConfig {
  target?: string;
  arch?: string;
  devdir?: string;
  nodedir?: string;
}

export declare function generateCMakeLists (
  config: Configuration,
  configPath: string,
  options: Record<string, any>,
  isEmscripten: boolean,
  parentPath: string | null,
  nodeConfig: NodeConfig,
  defines: Record<string, string>
): void;
export declare function getCMakeInclude (key: 'vcruntime' | 'require' | 'embuild'): string;
export declare function findProjectRoot (start?: string): string;
export declare function resolve (dirname: string, requireFunction: NodeRequire, request: string): string;
export declare function loadConfig (root: string, options?: Record<string, any>, parentRootDir: string, isClean: boolean): Configuration;
export declare function cleanBuild (configRoot: string, buildDirName: string): void;
export declare function defineObjectConfig (config: Configuration): Configuration;
export declare function defineFunctionConfig<O = any> (config: FunctionConfiguration<O>): FunctionConfiguration<O>;
