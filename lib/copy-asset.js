import { basename, dirname, join, relative } from "@std/path";
import { SRC_ASSET_EXTENSIONS } from "./extension-whitelist.js";
import { hashAssetName } from "./hash-asset.js";

/**
 * Copy an asset from the source tree to its distant output directory.
 *
 * Only files with extensions whitelisted in `SRC_ASSET_EXTENSIONS` are
 * processed.
 *
 * @param {string} path Absolute path to the asset on disk.
 * @returns {Promise<void>} Resolves when the asset has been copied.
 */
export async function copyAsset(path) {
  if (path.endsWith(".inline.js")) {
    // Inline scripts are bundled directly into HTML and should not be copied.
    return;
  }
  const ext = path.slice(path.lastIndexOf(".")).toLowerCase();
  if (!SRC_ASSET_EXTENSIONS.has(ext)) return;
  const siteDir = await findSiteRoot(path);
  const rel = relative(siteDir, path).replace(/\\/g, "/");
  const configPath = join(siteDir, "config.json");
  const configText = await Deno.readTextFile(configPath);
  const config = JSON.parse(configText);
  const distant = String(config.distantDirectory);
  let outRel = rel;
  if (config.hashAssets && (ext === ".css" || ext === ".js")) {
    const dirRel = dirname(rel);
    const base = basename(rel, ext);
    const hashed = await hashAssetName(path);
    const outDir = join(distant, dirRel);
    try {
      for await (const entry of Deno.readDir(outDir)) {
        if (
          entry.isFile &&
          entry.name.startsWith(`${base}.`) &&
          entry.name.endsWith(ext) &&
          entry.name !== hashed
        ) {
          await Deno.remove(join(outDir, entry.name));
        }
      }
    } catch (err) {
      if (!(err instanceof Deno.errors.NotFound)) throw err;
    }
    outRel = (dirRel === "." ? hashed : join(dirRel, hashed)).replace(
      /\\/g,
      "/",
    );
  }
  const outPath = join(distant, outRel);
  await Deno.mkdir(dirname(outPath), { recursive: true });
  await Deno.copyFile(path, outPath);
}

/**
 * Remove an asset from the distant output directory.
 *
 * Only files with extensions whitelisted in `SRC_ASSET_EXTENSIONS` are
 * processed.
 *
 * @param {string} path Absolute path to the asset on disk.
 * @returns {Promise<void>} Resolves when the asset has been removed.
 */
export async function removeAsset(path) {
  const ext = path.slice(path.lastIndexOf(".")).toLowerCase();
  if (!SRC_ASSET_EXTENSIONS.has(ext)) return;
  const siteDir = await findSiteRoot(path);
  const rel = relative(siteDir, path).replace(/\\/g, "/");
  const configPath = join(siteDir, "config.json");
  const configText = await Deno.readTextFile(configPath);
  const config = JSON.parse(configText);
  const distant = String(config.distantDirectory);
  if (config.hashAssets && (ext === ".css" || ext === ".js")) {
    const dirRel = dirname(rel);
    const base = basename(rel, ext);
    const outDir = join(distant, dirRel);
    try {
      for await (const entry of Deno.readDir(outDir)) {
        if (
          entry.isFile &&
          entry.name.startsWith(`${base}.`) &&
          entry.name.endsWith(ext)
        ) {
          await Deno.remove(join(outDir, entry.name));
        }
      }
    } catch (err) {
      if (!(err instanceof Deno.errors.NotFound)) throw err;
    }
    return;
  }
  const outPath = join(distant, rel);
  try {
    await Deno.remove(outPath);
  } catch (err) {
    if (!(err instanceof Deno.errors.NotFound)) throw err;
  }
}

/**
 * Walk up the directory tree looking for a `config.json` file.
 *
 * @param {string} filePath Path of the file whose site root is required.
 * @returns {Promise<string>} Directory containing the `config.json` file.
 */
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
