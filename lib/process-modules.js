import { dirname, join } from "@std/path";
import { hashAssetName } from "./hash-asset.js";
import { copyAsset } from "./copy-asset.js";
import { getEmoji } from "./emoji.js";
import { resolveDependency } from "./resolve-dependency.js";

/**
 * Handle module script references defined in front matter.
 *
 * @param {import('./parse-page.js').ParsedPage} page Parsed page object.
 * @param {string} siteDir Site root directory.
 * @param {boolean} hashAssets Whether asset hashing is enabled.
 * @returns {Promise<string[]>} List of module script files used by the page.
 */
export async function processModules(page, siteDir, hashAssets) {
  const modulesUsed = [];
  const moduleFiles = page.scripts.modules ?? [];
  page.scripts.modules = await Promise.all(
    moduleFiles.map(async (src) => {
      const relSrc = src.startsWith("/") ? src.slice(1) : src;
      const abs = join(siteDir, relSrc);
      const resolved = await resolveDependency(relSrc, siteDir);
      if (!resolved) {
        console.log(`${getEmoji("error")} MODULE missing -- ${relSrc}`);
        modulesUsed.push(abs);
        return src;
      }
      modulesUsed.push(resolved);
      await copyAsset(abs);
      if (!hashAssets) return src;
      const hashed = await hashAssetName(resolved);
      const dirRel = dirname(relSrc);
      const relPath = (dirRel === "." ? hashed : join(dirRel, hashed))
        .replace(/\\/g, "/");
      return src.startsWith("/") ? "/" + relPath : relPath;
    }),
  );
  return modulesUsed;
}
