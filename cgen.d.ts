declare interface Target {
  name: string;
  type: "exe" | "lib" | "dll";
  sources: string[];

  cStandard?: string;
  cxxStandard?: string;
  linkOptions?: string[];
  compileOptions?: string[];

  defines?: Record<string, string>;
  includePaths?: string[];
  publicIncludePaths?: string[];
  libPaths?: string[];
  libs?: string[];

  staticVCRuntime?: boolean;

  windows?: Partial<Omit<Target, 'windows' | 'linux' | 'macos'>>;
  linux?: Partial<Omit<Target, 'windows' | 'linux' | 'macos'>>;
  macos?: Partial<Omit<Target, 'windows' | 'linux' | 'macos'>>;
}

declare interface Configuration {
  project: string;
  targets: Target[];
  minimumVersion?: string;
  postScript?: string;
  dependencies?: string[];
}
