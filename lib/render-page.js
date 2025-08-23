import { basename, dirname, join, relative } from "@std/path";
import { parsePage } from "./parse-page.js";
import { logWithEmoji } from "./emoji.js";
import { findSiteRoot, loadConfig } from "./load-config.js";
import { processCss } from "./process-css.js";
import { processModules } from "./process-modules.js";
import { manageLinks } from "./manage-links.js";
import { buildDocument } from "./build-document.js";
import { toOutRel, writeOutput } from "./write-output.js";
import { applyFrontMatterHandlers } from "./front-matter-handlers.js";
import { convert } from "./conversion-registry.js";
import { generateFeed } from "./generate-feed.js";

// Register built-in converters
import "../plugins/markdown.js";
import "../plugins/json.js";

/** @type {Array<(page: any, context: any) => Promise<void>|void>} */
const preProcessors = [];
/** @type {Array<(doc: Document, context: any) => Promise<void>|void>} */
const postProcessors = [];

/**
 * Register a function to run during the pre-processing stage.
 *
 * @param {(page: any, context: any) => Promise<void>|void} fn Function to register.
 */
export function registerPreProcessor(fn) {
  preProcessors.push(fn);
}

/**
 * Register a function to run during the post-processing stage.
 *
 * @param {(doc: Document, context: any) => Promise<void>|void} fn Function to register.
 */
export function registerPostProcessor(fn) {
  postProcessors.push(fn);
}

/**
 * Run initial transformations on the parsed page before assembly.
 *
 * @param {any} page Parsed page data.
 * @param {any} context Rendering context object.
 * @returns {Promise<void>} Resolves when processing is complete.
 */
export async function preProcess(page, context) {
  const { path } = context;
  try {
    page.html = await convert(path, page.html);
  } catch (err) {
    if (err instanceof Error) err.message = `${path}: ${err.message}`;
    throw err;
  }

  const { siteDir, config } = await loadConfig(path);
  const distant = String(config.distantDirectory);
  const pretty = Boolean(config.prettyUrls);
  const hashAssets = Boolean(config.hashAssets);

  context.siteDir = siteDir;
  context.config = config;
  context.distant = distant;
  context.pretty = pretty;
  context.hashAssets = hashAssets;

  context.cssUsed = await processCss(page, siteDir, hashAssets);
  context.modulesUsed = await processModules(page, siteDir, hashAssets);

  const { linksManager, linksUsed, linksChanged } = await manageLinks(
    page,
    siteDir,
    path,
    pretty,
  );

  context.linksManager = linksManager;
  context.linksUsed = linksUsed;
  context.linksChanged = linksChanged;

  for (const fn of preProcessors) {
    await fn(page, context);
  }
}

/**
 * Assemble the final document from the processed page.
 *
 * @param {any} page Parsed page data.
 * @param {any} context Rendering context object.
 * @returns {Promise<Document>} Resulting HTML document.
 */
export async function assemble(page, context) {
  const { linksManager, config, root, siteDir, path } = context;
  const { doc, templatesUsed, scriptsUsed, svgsUsed } = await buildDocument(
    page,
    linksManager,
    config,
    root,
    siteDir,
    path,
  );

  context.templatesUsed = templatesUsed;
  context.scriptsUsed = scriptsUsed;
  context.svgsUsed = svgsUsed;

  return doc;
}

/**
 * Apply post-processing hooks and write the output document to disk.
 *
 * @param {Document} doc Rendered document.
 * @param {any} context Rendering context object.
 * @returns {Promise<void>} Resolves when writing is complete.
 */
export async function postProcess(doc, context) {
  for (const fn of postProcessors) {
    await fn(doc, context);
  }

  await writeOutput(
    doc,
    context.path,
    context.siteDir,
    context.distant,
    context.pretty,
  );

  const rel = relative(context.siteDir, context.path).replace(/\\/g, "/");
  if (rel.startsWith("blog/")) {
    await generateFeed(context.siteDir, context.config);
  }
}

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
    const file = basename(path);
    if (file.toLowerCase().startsWith("disabled.")) {
      // Treat prefixed files as deletions of the original page. The page is not
      // rendered and any existing output or navigation entries are removed.
      const original = join(dirname(path), file.replace(/^disabled\./i, ""));
      logWithEmoji("skip", `Disabled page -- ${path}`);
      const { siteDir, config } = await loadConfig(original);
      const pretty = Boolean(config.prettyUrls);
      const page = { frontMatter: {} };
      const { linksChanged } = await manageLinks(
        page,
        siteDir,
        original,
        pretty,
      );
      await removePage(original);
      return {
        pagePath: original,
        templatesUsed: [],
        svgsUsed: [],
        scriptsUsed: [],
        cssUsed: [],
        modulesUsed: [],
        linksUsed: false,
        linksChanged,
        links: undefined,
      };
    }

    const page = await parsePage(path);
    const context = { path, root };

    await preProcess(page, context);
    const doc = await assemble(page, context);
    await postProcess(doc, context);

    return {
      pagePath: path,
      templatesUsed: context.templatesUsed,
      svgsUsed: context.svgsUsed,
      scriptsUsed: context.scriptsUsed,
      cssUsed: context.cssUsed,
      modulesUsed: context.modulesUsed,
      linksUsed: context.linksUsed,
      linksChanged: context.linksChanged,
      links: page.links,
    };
  } catch (err) {
    if (err instanceof Error) {
      if (!err.message.includes(path)) {
        err.message = `${path}: ${err.message}`;
      }
    }
    logWithEmoji("error", err);
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
