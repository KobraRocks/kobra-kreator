import {
  dirname,
  join,
  relative,
} from "https://deno.land/std@0.224.0/path/mod.ts";

export async function copyAsset(path) {
  try {
    const siteDir = await findSiteRoot(path);
    const rel = relative(siteDir, path).replace(/\\/g, "/");
    const configPath = join(siteDir, "config.json");
    const configText = await Deno.readTextFile(configPath);
    const config = JSON.parse(configText);
    const distant = String(config.distantDirectory);
    const outPath = join(distant, rel);
    await Deno.mkdir(dirname(outPath), { recursive: true });
    await Deno.copyFile(path, outPath);
  } catch (err) {
    if (err instanceof Error) {
      if (!err.message.includes(path)) err.message = `${path}: ${err.message}`;
      console.error(err);
    } else {
      console.error(err);
    }
  }
}

async function findSiteRoot(filePath) {
  let dir = dirname(filePath);
  while (true) {
    try {
      const stat = await Deno.stat(join(dir, "config.json"));
      if (stat.isFile) return dir;
    } catch (err) {
      if (!(err instanceof Deno.errors.NotFound)) throw err;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      throw new Error(`config.json not found for ${filePath}`);
    }
    dir = parent;
  }
}
