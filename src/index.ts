import type { PackageJson } from "../types/package-json-types.ts";
import { LockManager } from "./lock.ts";
import list from "./list.ts";
import install from "./install.ts";
import { beautifyJson, findFile, writeJsonToFile } from "../utils/helpers.ts";

export default async function (args: any) {
  const packageStore: PackageJson = await Bun.file(
    findFile("package.json") as string
  ).json();
  if (!packageStore) {
    console.error("No package.json found in the current directory");
    return;
  }
  const additionalPackages = args._.slice(1);
  if (args["save-dev"] || args["save"]) {
    addPackagesToDependencies(args, packageStore, additionalPackages);
  }
  if (args.production) {
    delete packageStore.devDependencies;
  }
  const lock = new LockManager();
  await lock.readLock();

  const info = await list(packageStore);
  await lock.writeLock();

  await installPackages(info);
  writeJsonToFile(packageStore, "package.json");
  beautifyJson(packageStore);
}

function addPackagesToDependencies(
  args: any,
  packageStore: any,
  additionalPackages: string[]
) {
  if (args["save-dev"]) {
    packageStore.devDependencies = packageStore.devDependencies || {};
    additionalPackages.forEach(
      (pkg: string) => (packageStore.devDependencies![pkg] = "")
    );
  } else {
    packageStore.dependencies = packageStore.dependencies || {};
    additionalPackages.forEach(
      (pkg: string) => (packageStore.dependencies![pkg] = "")
    );
  }
}

async function installPackages(info: {
  flattenedPkgs: {
    [name: string]: {
      url: string;
      version: string;
    };
  };
  unsatisfiedDeps: {
    depName: string;
    parent: string;
    url: string;
  }[];
}) {
  await Promise.all(
    Object.entries(info.flattenedPkgs).map(([name, { url }]) =>
      install(name, url)
    )
  );
  await Promise.all(
    info.unsatisfiedDeps.map((item) =>
      install(item.depName, item.url, `/node_modules/${item.parent}`)
    )
  );
}
