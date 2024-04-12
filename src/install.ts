import fs from "node:fs/promises";
import tar from "tar";
import { request } from "undici";

export default async function(pkgName: string, url: string, location = "") {
  const installPath = `${process.cwd()}${location}/node_modules/${pkgName} `;

  await fs.mkdir(installPath, {
    recursive: true,
  });

  const res = await request(url);
  res.body.pipe(tar.extract({ cwd: installPath, strip: 1 }));
}
