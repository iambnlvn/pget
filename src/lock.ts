import fs from "node:fs/promises";
import yaml from "yaml";
import { sortKeys } from "../utils/sortKeys";

import type { Version } from "../types/registry";

export class LockManager {
  oldLock: Version;
  newLock: Version;

  constructor() {
    this.oldLock = Object.create(null);
    this.newLock = Object.create(null);
  }
  createOrUpdate(pkgName: string, pkgInfo: Version[string]): void {
    if (!this.newLock[pkgName]) {
      this.newLock[pkgName] = Object.create(null);
    }
    Object.assign(this.newLock[pkgName], pkgInfo);
  }
  get(pkgName: string, constraint: string): Version | null {
    const pkg = this.oldLock[`${pkgName}@${constraint}`];
    if (!pkg) {
      return null;
    }
    return {
      [pkg.version as string]: {
        name: pkg.name,
        _id: pkg._id,
        _npmVersion: pkg._npmVersion,
        dependencies: pkg.dependencies,
        dist: pkg.dist,
        engine: pkg.engine,
        directories: pkg.directories,
        keywords: pkg.keywords,
        _nodeSupported: pkg._nodeSupported,
        _nodeVersion: pkg._nodeVersion,
        author: pkg.author,
        contributors: pkg.contributors,
        main: pkg.main,
        description: pkg.description,
        repository: pkg.repository,
        version: pkg.version,
        scripts: pkg.scripts,
        deprecated: pkg.deprecated,
        devDependencies: pkg.devDependencies,
      },
    };
  }
  async writeLock(): Promise<void> {
    try {
      await fs.writeFile(
        "./pget-store.yaml",
        yaml.stringify(sortKeys(this.newLock))
      );
    } catch (error) {
      if (
        ["EACCES", "EPERM"].includes(
          (error as NodeJS.ErrnoException).code as string
        )
      ) {
        console.error("Insufficient permissions to write lock file");
      }
      console.error("Failed to write lock file");
    }
  }
  async readLock(): Promise<void> {
    try {
      if (await fs.exists("./pget-store.yaml")) {
        Object.assign(
          this.oldLock,
          yaml.parse(await fs.readFile(`./pget-store.yaml`, "utf-8"))
        );
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        console.error("Lock file not found");
      } else {
        console.error("Failed to read lock file");
      }
    }
  }
}
