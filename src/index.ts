import fs from "node:fs";
import path from "path";
import type { PackageJson } from "../types/package-json-types.ts";

const findFile = (fileName: string, dir: string = "."): string | undefined => {
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
};
const packageStore: PackageJson = await Bun.file(
  findFile("package.json") as string
).json();
console.log(packageStore);
