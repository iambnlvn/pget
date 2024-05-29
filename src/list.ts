import type { PackageJson } from "../types/package-json-types";
import type {
  Dependencies,
  Directories,
  Dist,
  Engines,
} from "../types/registry";
import { LockManager } from "./lock";
import { resolveVersions } from "./resolve";
import { semver } from "bun";

type DepStack = Array<{
  depName: string;
  version: string;
  dependencies?: Dependencies;
}>;
const unsatisfiedDeps: Array<{ depName: string; parent: string; url: string }> =
  [];
const flattenedPkgs: { [name: string]: { url: string; version: string } } =
  Object.create(null);

async function getDependency(
  depName: string,
  constraint: string,
  stack: DepStack
): Promise<any> {
  const lock = new LockManager();
  const manifest =
    lock.get(depName, constraint) || (await resolveVersions(depName));
  const versions = Object.keys(manifest);

  const matchedDep = constraint
    ? semver.satisfies(versions, constraint)
    : versions[versions.length - 1];
  if (!matchedDep) {
    throw new Error("Cannot resolve the package !");
  }

  const matchedManifest = manifest[matchedDep.toString()];

  if (!flattenedPkgs[depName]) {
    flattenedPkgs[depName] = {
      url: matchedManifest.dist ? (matchedManifest.dist as Dist).tarball : "",
      version: matchedDep.toString(),
    };
  } else if (
    semver.satisfies(flattenedPkgs[depName].version, matchedDep.toString())
  ) {
    const conflictIndex = checkStackDependencies(
      depName,
      matchedDep.toString(),
      stack
    );
    if (conflictIndex !== -1) {
      throw new Error("Dependency conflict detected !");
    }
    unsatisfiedDeps.push({
      depName,
      parent: stack
        .map(({ depName }) => depName)
        .slice(conflictIndex - 2)
        .join("/node_modules/"),
      url: (matchedManifest.dist as Dist)?.tarball || "",
    });
  } else {
    unsatisfiedDeps.push({
      depName,
      parent: stack.at(-1)!.depName,
      url: (matchedManifest.dist as Dist).tarball,
    });
  }

  const dependencies = matchedManifest.dependencies ?? {};

  lock.createOrUpdate(`${depName}@${constraint}`, {
    name: depName,
    version: matchedDep.toString(),
    _id: matchedManifest._id.toString(),
    _npmVersion: matchedManifest._npmVersion.toString(),
    dependencies: dependencies as Dependencies,
    dist: matchedManifest.dist as Dist,
    engine: matchedManifest.engine as Engines,
    directories: matchedManifest.directories as Directories,
    keywords: matchedManifest.keywords as string[],
    _nodeSupported: matchedManifest._nodeSupported as boolean,
    _nodeVersion: matchedManifest._nodeVersion as string,
  });

  if (dependencies) {
    stack.push({
      depName,
      version: matchedDep.toString(),
      dependencies: dependencies.dependencies as Dependencies,
    });
    await Promise.all(
      Object.entries(dependencies)
        .filter(
          ([depName, constraint]) =>
            !hasCirculation(depName, constraint.toString(), stack)
        )
        .map(([depName, constraint]) =>
          getDependency(depName, constraint.toString(), stack.slice())
        )
    );
    stack.pop();
  }

  if (!constraint) {
    return {
      depName,
      version: matchedDep.toString(),
      dependencies: dependencies as Dependencies,
    };
  }
}

function hasCirculation(depName: string, constraint: string, stack: DepStack) {
  return stack.some(
    (item) =>
      item.depName === depName && semver.satisfies(item.version, constraint)
  );
}

function checkStackDependencies(
  name: string,
  version: string,
  stack: DepStack
) {
  return stack.findIndex(({ dependencies }) => {
    const semverRange = dependencies && dependencies[name];
    if (!semverRange) {
      return true;
    }

    return semver.satisfies(version, semverRange);
  });
}

async function processDependencies(
  dependencies: Partial<Record<string, string>> | undefined
) {
  if (!dependencies) return;

  const processedDeps = await Promise.all(
    Object.entries(dependencies).map(([depName, constraint]) =>
      getDependency(depName, constraint!, [])
    )
  );
  processedDeps
    .filter(Boolean)
    .forEach((dep) => (dependencies[dep.depName] = dep.version));
}

export default async function list(rootManifest: PackageJson) {
  await processDependencies(rootManifest.dependencies);
  await processDependencies(rootManifest.devDependencies);

  return { flattenedPkgs, unsatisfiedDeps };
}
