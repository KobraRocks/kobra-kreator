import { join, relative } from "@std/path";
import { LinksManager } from "./links.js";

/**
 * Merge page links into the global links manager.
 *
 * @param {import('./parse-page.js').ParsedPage} page Parsed page object.
 * @param {string} siteDir Site root directory.
 * @param {string} path Absolute path to the page being rendered.
 * @param {boolean} pretty Whether to generate pretty URLs.
 * @returns {Promise<{linksManager: LinksManager, linksUsed: boolean, linksChanged: boolean}>}
 * Links metadata used by the page.
 */
export async function manageLinks(page, siteDir, path, pretty) {
  const linksManager = new LinksManager(join(siteDir, "links.json"));
  await linksManager.load();
  const rel = relative(siteDir, path).replace(/\\/g, "/");
  const href = toHref(rel, pretty);
  const linksUsed = page.frontMatter.links !== undefined;
  const linksChanged = linksManager.merge(href, page.links ?? {});
  if (linksChanged) await linksManager.save();
  return { linksManager, linksUsed, linksChanged };
}

/**
 * Build the href used in `links.json` for a page.
 *
 * @param {string} rel Page path relative to the site root.
 * @param {boolean} pretty Whether `.html` extensions should be omitted.
 * @returns {string} Href beginning with a leading slash.
 */
export function toHref(rel, pretty) {
  const normalized = rel.replace(/\\/g, "/").replace(/\.(md|html?)$/i, ".html");
  if (!pretty) return "/" + normalized;
  // Remove common filenames.
  const noExt = normalized.replace(/index\.html$/i, "").replace(/\.html$/i, "");
  if (noExt === "") return "/";
  return "/" + noExt.replace(/\/$/, "") + "/";
}
