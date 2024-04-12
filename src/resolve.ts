import { request } from "undici";
import type { Manifest, VersionMap } from "../types/registry.ts";
import { NetworkError, PackageNotFoundError } from "./errors.ts";

const REGISTRY = Bun.env.REGISTRY || "https://registry.npmjs.org/";

const TIMEOUT = Number(Bun.env.RESOLVETIMEOUT || 5000);
const RETRIES = Number(Bun.env.RETRIES || 3);
const cache = new Map<string, VersionMap>();

async function retry<T>(fn: () => Promise<T>, retries: number): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) {
      throw new Error("Max retries reached!");
    }
    return retry(fn, retries - 1);
  }
}

export const resolveVersions = async (pkgName: string): Promise<VersionMap> => {
  if (cache.has(pkgName)) {
    return cache.get(pkgName)!;
  }

  const registryResponse = await retry(async () => {
    return await Promise.race([
      request(`${REGISTRY}${pkgName}`),
      new Promise<any>((_, reject) =>
        setTimeout(() => reject(new NetworkError("Request timed out")), TIMEOUT)
      ),
    ]);
  }, RETRIES);

  const jsonManifest: { error: string } | Manifest =
    await registryResponse.body.json();

  if ("error" in jsonManifest) {
    throw new PackageNotFoundError(`Package ${pkgName} not found!`);
  }

  cache.set(pkgName, jsonManifest.versions);
  return cache.get(pkgName)!;
};
