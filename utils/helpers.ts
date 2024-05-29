import type { PackageJson } from "../types/package-json-types";
import fs from "node:fs";
import path from "path";

export function sortKeys<T extends { [key: string]: any }>(obj: T) {
  return Object.fromEntries(
    Object.entries(obj).sort(([a], [b]) => a.localeCompare(b))
  );
}

export function findFile(fileName: string, dir = "."): string | undefined {
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const fileStat = fs.statSync(filePath);

      if (fileStat.isDirectory()) {
        const foundFile = findFile(fileName, filePath);
        if (foundFile) return foundFile;
      } else if (path.basename(file) === fileName) {
        return filePath;
      }
    }
  } catch (err) {
    console.error(`Error reading directory ${dir}: ${err}`);
  }
}

export function beautifyJson(packageJson: PackageJson) {
  if (!packageJson) return;

  ["dependencies", "devDependencies"].forEach((key) => {
    if (packageJson[key]) {
      packageJson[key] = sortKeys(packageJson[key] as { [key: string]: any });
    }
  });
}

export function writeJsonToFile(jsonObj: any, filePath: string) {
  const jsonString = JSON.stringify(jsonObj, null, 2);
  fs.writeFile(filePath, jsonString, (err: any) => {
    if (err) {
      console.log("Error writing file", err);
    } else {
      console.log("Successfully wrote JSON to file");
    }
  });
}
