import { dirname, join, fromFileUrl } from "@std/path";
import { hashAssetName } from "./hash-asset.js";
import { copyAsset } from "./copy-asset.js";
import { getEmoji } from "./emoji.js";

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
      try {
        const real = await Deno.realPath(abs);
        cssUsed.push(real);
        if (!hashAssets) return href;
        const hashed = await hashAssetName(real);
        const dirRel = dirname(relHref);
        const relPath = (dirRel === "." ? hashed : join(dirRel, hashed))
          .replace(/\\/g, "/");
        return href.startsWith("/") ? "/" + relPath : relPath;
      } catch {
        const corePath = fromFileUrl(
          new URL(`../core/css/${relHref}`, import.meta.url),
        );
        try {
          await Deno.stat(corePath);
          cssUsed.push(abs);
          if (hashAssets) {
            const hashed = await hashAssetName(corePath);
            const dirRel = dirname(relHref);
            const relPath = (dirRel === "." ? hashed : join(dirRel, hashed))
              .replace(/\\/g, "/");
            await copyAsset(abs);
            return href.startsWith("/") ? "/" + relPath : relPath;
          }
          await copyAsset(abs);
          return href;
        } catch {
          console.log(`${getEmoji("error")} CSS missing -- ${relHref}`);
          cssUsed.push(abs);
          return href;
        }
      }
    }),
  );
  return cssUsed;
}
