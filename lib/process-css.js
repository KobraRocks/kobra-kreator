import { dirname, join } from "@std/path";
import { hashAssetName } from "./hash-asset.js";
import { copyAsset } from "./copy-asset.js";
import { getEmoji } from "./emoji.js";
import { resolveDependency } from "./resolve-dependency.js";

/**
 * Handle CSS references from page front matter.
 *
 * @param {import('./parse-page.js').ParsedPage} page Parsed page object.
 * @param {string} siteDir Site root directory.
 * @param {boolean} hashAssets Whether asset hashing is enabled.
 * @returns {Promise<string[]>} List of CSS files used by the page.
 */
export async function processCss(page, siteDir, hashAssets) {
  const cssUsed = [];
  const cssFiles = page.frontMatter.css ?? [];
  page.frontMatter.css = await Promise.all(
    cssFiles.map(async (href) => {
      const relHref = href.startsWith("/") ? href.slice(1) : href;
      const abs = join(siteDir, relHref);
      const resolved = await resolveDependency(relHref, siteDir);
      if (!resolved) {
        console.log(`${getEmoji("error")} CSS missing -- ${relHref}`);
        cssUsed.push(abs);
        return href;
      }
      cssUsed.push(resolved);
      await copyAsset(abs);
      if (!hashAssets) return href;
      const hashed = await hashAssetName(resolved);
      const dirRel = dirname(relHref);
      const relPath = (dirRel === "." ? hashed : join(dirRel, hashed))
        .replace(/\\/g, "/");
      return href.startsWith("/") ? "/" + relPath : relPath;
    }),
  );
  return cssUsed;
}
