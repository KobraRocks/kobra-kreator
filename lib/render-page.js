import { join, relative } from "@std/path";
import { parsePage } from "./parse-page.js";
import { markdownToHTML } from "./markdown.js";
import { getEmoji } from "./emoji.js";
import { loadConfig, findSiteRoot } from "./load-config.js";
import { processCss } from "./process-css.js";
import { processModules } from "./process-modules.js";
import { manageLinks } from "./manage-links.js";
import { buildDocument } from "./build-document.js";
import { writeOutput, toOutRel } from "./write-output.js";

/**
 * @typedef {object} RenderResult
 * @property {string} pagePath Path to the source file that was rendered.
 * @property {string[]} templatesUsed Template files referenced by the page.
 * @property {string[]} svgsUsed SVG files referenced by the page.
 * @property {string[]} scriptsUsed Inline script files referenced by the page.
 * @property {string[]} cssUsed CSS files referenced by the page.
 * @property {string[]} modulesUsed External module scripts referenced by the page.
 * @property {boolean} linksUsed Whether the page includes `[links]` front matter.
 * @property {boolean} linksChanged Whether `links.json` was updated.
 * @property {import("./links.js").PageLinks} [links] Page links from front matter.
 */

/**
 * Render a single HTML or Markdown source file to its output destination.
 *
 * @param {string} path Absolute path to the source HTML or Markdown file.
 * @param {URL} [root] Base URL used to resolve template locations.
 * @returns {Promise<RenderResult|undefined>} Dependencies referenced by the
 * rendered page or `undefined` if an error occurred.
 */
export async function renderPage(path, root = new URL("..", import.meta.url)) {
  try {
    const page = await parsePage(path);

    if (path.toLowerCase().endsWith(".md")) {
      try {
        page.html = markdownToHTML(page.html);
      } catch (err) {
        if (err instanceof Error) err.message = `${path}: ${err.message}`;
        throw err;
      }
    }

    const { siteDir, config } = await loadConfig(path);
    const distant = String(config.distantDirectory);
    const pretty = Boolean(config.prettyUrls);
    const hashAssets = Boolean(config.hashAssets);

    const cssUsed = await processCss(page, siteDir, hashAssets);
    const modulesUsed = await processModules(page, siteDir, hashAssets);

    const { linksManager, linksUsed, linksChanged } = await manageLinks(
      page,
      siteDir,
      path,
      pretty,
    );

    const { doc, templatesUsed, scriptsUsed, svgsUsed } = await buildDocument(
      page,
      linksManager,
      config,
      root,
      siteDir,
      path,
    );

    await writeOutput(doc, path, siteDir, distant, pretty);

    return {
      pagePath: path,
      templatesUsed,
      svgsUsed,
      scriptsUsed,
      cssUsed,
      modulesUsed,
      linksUsed,
      linksChanged,
      links: page.links,
    };
  } catch (err) {
    if (err instanceof Error) {
      if (!err.message.includes(path)) {
        err.message = `${path}: ${err.message}`;
      }
    }
    console.error(getEmoji("error"), err);
  }
}

/**
 * Remove the rendered HTML output associated with a source file.
 *
 * @param {string} path Absolute path to the source HTML or Markdown file.
 * @returns {Promise<void>} Resolves when the output file has been removed.
 */
export async function removePage(path) {
  const siteDir = await findSiteRoot(path);
  const configPath = join(siteDir, "config.json");
  const configText = await Deno.readTextFile(configPath);
  const config = JSON.parse(configText);
  const distant = String(config.distantDirectory);
  const rel = relative(siteDir, path).replace(/\\/g, "/");
  const outRel = toOutRel(rel, Boolean(config.prettyUrls));
  const outPath = join(distant, outRel);
  try {
    await Deno.remove(outPath);
  } catch (err) {
    if (!(err instanceof Deno.errors.NotFound)) throw err;
  }
}
