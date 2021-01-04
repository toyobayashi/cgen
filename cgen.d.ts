/// <reference types="node" />

export declare interface Target {
  name: string;
  type: "exe" | "lib" | "dll";
  sources: string[];

  cStandard?: string;
  cxxStandard?: string;
  linkOptions?: string[];
  compileOptions?: string[];

  defines?: string[];
  publicDefines?: string[];
  includePaths?: string[];
  publicIncludePaths?: string[];
  libPaths?: string[];
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
  dependencies?: Record<string, Record<string, any>>
}

export declare type FunctionConfiguration<O = any> = (options: O) => Configuration;

export declare function generateCMakeLists (config: Configuration, configPath: string): void;
export declare function getCMakeInclude (key: 'vcruntime' | 'require'): string;
export declare function findProjectRoot (start?: string): string;
export declare function resolve (dirname: string, requireFunction: NodeRequire, request: string): string;
export declare function loadConfig (root: string, options?: Record<string, any>): Configuration;
export declare function cleanBuild (configRoot: string, buildDirName: string): void;
export declare function defineObjectConfig (config: Configuration): Configuration;
export declare function defineFunctionConfig<O = any> (config: FunctionConfiguration<O>): FunctionConfiguration<O>;
