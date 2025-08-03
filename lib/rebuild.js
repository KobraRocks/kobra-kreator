import { walk } from "@std/fs/walk";
import { renderPage } from "./render-page.js";

/**
 * Render every HTML page found under the `src/` directory.
 *
 * @returns {Promise<void>}
 */
export async function renderAllPages() {
  const root = new URL("../src", import.meta.url);
  try {
    for await (
      const entry of walk(root, { exts: [".html"], includeDirs: false })
    ) {
      await renderPage(entry.path);
    }
  } catch (err) {
    if (!(err instanceof Deno.errors.NotFound)) throw err;
  }
}

/**
 * Re-render all pages when a template changes.
 *
 * @param {string} _path Path to the updated template (unused).
 * @returns {Promise<void>}
 */
export async function renderAllUsingTemplate(_path) {
  await renderAllPages();
}

/**
 * Re-render all pages when a shared SVG changes.
 *
 * @param {string} _path Path to the updated SVG (unused).
 * @returns {Promise<void>}
 */
export async function renderAllUsingSvg(_path) {
  await renderAllPages();
}
