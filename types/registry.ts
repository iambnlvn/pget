export interface Manifest {
  _id: string;
  _rev: string;
  name: string;
  description?: string;
  "dist-tags": { latest: string; next: string };
  versions: VersionMap;
  maintainers?: Author[];
  author?: Author;
  repository?: Repository;
  readme?: string;
  readmeFilename?: string;
  homepage?: string;
  keywords?: string[];
  contributors?: Author[];
}
export interface Version {
  [version: string]: {
    name: string;
    description?: string;
    main?: string;
    dependencies?: Dependencies;
    devDependencies?: Dependencies;
    scripts?: { [script: string]: string };
    repository?: Repository;
    version?: string;
    author?: Author;
    contributors?: Author[];
    keywords?: string[];
    directories?: Directories;
    engine?: Engines;
    _id: string;
    _nodeSupported?: boolean;
    _npmVersion: string;
    _nodeVersion?: string;
    dist: Dist;
    deprecated?: string;
  };
}
export type VersionMap = { [version: string]: Version };

export interface Dist {
  shasum: string;
  tarball: string;
  integrity?: string;
  signatures?: Signature[];
}
export interface Signature {
  keyid?: string;
  sig?: string;
}
export interface Author {
  name?: string;
  email?: string;
}
export interface Dependencies {
  [dependency: string]: string;
}

export interface Engines {
  node?: string;
}

export interface Directories {
  lib?: string;
}
export interface Repository {
  type?: string;
  url?: string;
}
