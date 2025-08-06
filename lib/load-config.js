import { dirname, join } from "@std/path";

/**
 * Load the site configuration for a given source file.
 *
 * @param {string} filePath Absolute path to the source file.
 * @returns {Promise<{siteDir: string, config: Record<string, unknown>}>} Site
 * root directory and parsed configuration.
 */
export async function loadConfig(filePath) {
  const siteDir = await findSiteRoot(filePath);
  const configPath = join(siteDir, "config.json");
  const configText = await Deno.readTextFile(configPath);
  const config = JSON.parse(configText);
  return { siteDir, config };
}

/**
 * Walk up the directory hierarchy to locate the site root containing
 * `config.json`.
 *
 * @param {string} filePath Path used to search for the site root.
 * @returns {Promise<string>} Directory path containing `config.json`.
 */
export async function findSiteRoot(filePath) {
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
