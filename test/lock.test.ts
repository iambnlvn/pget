import { describe, expect, beforeEach, afterEach, test, jest } from "bun:test";
import fs from "node:fs/promises";
import { LockManager } from "../src/lock";
import { sortKeys } from "../utils/helpers";
import pkg from "./test-package.json";

import yaml from "yaml";

yaml.stringify = jest.fn().mockImplementation((data: any) => {
  return "yaml content";
});

yaml.parse = jest.fn().mockImplementation((data: any) => {
  return "yaml content";
});
fs.writeFile = jest.fn().mockImplementation((path: string, content: string) => {
  Promise.resolve(undefined);
  Promise.reject();
});
fs.exists = jest.fn().mockImplementation((path: string) => {
  Promise.resolve(true);
  Promise.reject(false);
});
fs.readFile = jest
  .fn()
  .mockImplementation((path: string, encoding?: string) => {
    Promise.resolve("");
    Promise.reject();
  });
describe("LockManager", () => {
  let lockManager: LockManager;
  beforeEach(() => {
    lockManager = new LockManager();
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("should create or update a package", () => {
    let v = pkg.versions["1.0.0"];
    const pack = {
      "1.0.0": {
        name: v.name,
        _id: v._id,
        _npmVersion: v._npmVersion,
        dependencies: v.dependencies,
        dist: v.dist,
        engine: v.engine,
        directories: v.directories,
        keywords: v.keywords,
        author: v.author,
        main: v.main,
        description: v.description,
        repository: v.repository,
        version: v.version,
        scripts: v.scripts,
        devDependencies: v.devDependencies,
      },
    };

    lockManager.oldLock["yargs@1.0.0"] = pkg.versions["1.0.0"];
    lockManager.createOrUpdate("yargs", pkg.versions["1.0.0"]);
    expect(lockManager.get("yargs", "1.0.0")).toEqual(pack);
  });

  test("should return null if package not found", () => {
    expect(lockManager.get("name", "1.0.0")).toBeNull();
  });

  test("should write lock file", async () => {
    (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
    (yaml.stringify as jest.Mock).mockReturnValue("yaml content");
    await lockManager.writeLock();
    expect(yaml.stringify).toHaveBeenCalledWith(sortKeys(lockManager.newLock));
    expect(fs.writeFile).toHaveBeenCalledWith(
      "./pget-store.yaml",
      "yaml content"
    );
  });
  test("should error if insufficient permissions or not permitted to write lock file", async () => {
    const testError = async (errorCode: string) => {
      let rejectionError: NodeJS.ErrnoException = new Error(
        "Insufficient permissions to write lock file"
      );
      rejectionError.code = errorCode;
      (fs.writeFile as jest.Mock).mockRejectedValue(rejectionError);
      try {
        await lockManager.writeLock();
      } catch (err) {
        expect(err).toBe("Insufficient permissions to write lock file");
        expect((err as NodeJS.ErrnoException).code).toEqual(errorCode);
      }
    };

    await testError("EACCES");
    await testError("EPERM");
  });
  test("should log an error if failed to write to lock file", async () => {
    let rejectionErrror: NodeJS.ErrnoException = new Error(
      "Failed to write lock file"
    );
    rejectionErrror.code = "EFAIL";
    (fs.writeFile as jest.Mock).mockRejectedValue(rejectionErrror);
    try {
      await lockManager.writeLock();
    } catch (err) {
      expect(err).toBe("Failed to write lock file");
      expect((err as NodeJS.ErrnoException).code).toEqual("EFAIL");
    }
  });

  test("should read lock file", async () => {
    (fs.exists as jest.Mock).mockResolvedValue(true);
    (fs.readFile as jest.Mock).mockResolvedValue("yaml content");
    (yaml.parse as jest.Mock).mockReturnValue("yaml content");
    await lockManager.readLock();
    expect(yaml.parse).toHaveBeenCalledWith(
      await fs.readFile("./pget-store.yaml", "utf-8")
    );
  });
  //Not sure if it should create a lock file if not found
  // test("should create a lock file if not found", async () => {
  //   (fs.exists as jest.Mock).mockResolvedValue(false);
  //   await lockManager.writeLock();
  //   expect(yaml.stringify).toHaveBeenCalledWith(sortKeys(lockManager.newLock));
  //   expect(fs.writeFile).toHaveBeenCalledWith(
  //     "./pget-store.yaml",
  //     "yaml content"
  //   );
  // });

  test("should log an error if lock file not found", async () => {
    let rejectionErrror: NodeJS.ErrnoException = new Error(
      "lock file not found"
    );
    rejectionErrror.code = "ENOENT";
    (fs.readFile as jest.Mock).mockRejectedValue(rejectionErrror);
    try {
      await lockManager.readLock();
    } catch (err) {
      expect(err).toBe("lock file not found");
      expect((err as NodeJS.ErrnoException).code).toEqual("ENOENT");
    }
  });
  test("should throw error if lock file not found", async () => {
    (fs.exists as jest.Mock).mockResolvedValue(false);
    try {
      await lockManager.readLock();
    } catch (err) {
      expect(err).toBe("Lock file not found");
    }
  });
});
