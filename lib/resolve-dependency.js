import { join, fromFileUrl } from "@std/path";

/**
 * Resolve a dependency path relative to the site, shared, then core directories.
 *
 * Searches for the file under the site's directory first. If not found, the
 * `/shared` and `/core` folders are checked in order using the same relative
 * path. Returns the first existing path or `undefined` when no match is
 * located.
 *
 * @param {string} relPath Path relative to the root, e.g. `"css/style.css"`.
 * @param {string} siteDir Absolute path to the site's root directory.
 * @returns {Promise<string|undefined>} Resolved absolute file path or
 * `undefined` if it does not exist in any location.
 */
export async function resolveDependency(relPath, siteDir) {
  const sitePath = join(siteDir, relPath);
  try {
    return await Deno.realPath(sitePath);
  } catch {
    // fall through to shared/core lookup
  }

  const sharedPath = fromFileUrl(new URL(`../shared/${relPath}`, import.meta.url));
  try {
    await Deno.stat(sharedPath);
    return sharedPath;
  } catch {
    // fall through
  }

  const corePath = fromFileUrl(new URL(`../core/${relPath}`, import.meta.url));
  try {
    await Deno.stat(corePath);
    return corePath;
  } catch {
    return undefined;
  }
}
