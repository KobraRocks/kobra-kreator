import { dirname, join } from "@std/path";
import { hashAssetName } from "./hash-asset.js";

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
      let real;
      try {
        real = await Deno.realPath(abs);
      } catch {
        real = abs;
      }
      modulesUsed.push(real);
      if (!hashAssets) return src;
      const hashed = await hashAssetName(abs);
      const dirRel = dirname(relSrc);
      const relPath = (dirRel === "." ? hashed : join(dirRel, hashed))
        .replace(/\\/g, "/");
      return src.startsWith("/") ? "/" + relPath : relPath;
    }),
  );
  return modulesUsed;
}
