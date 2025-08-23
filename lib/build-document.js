import { DOMParser } from "@b-fuze/deno-dom";
import { applyTemplates, importTemplate } from "./apply-templates.js";
import { inlineSvg } from "./inline-svg.js";
import { join, relative, toFileUrl } from "@std/path";

/**
 * Construct the final DOM document for a page.
 *
 * @param {import('./parse-page.js').ParsedPage} page Parsed page object.
 * @param {import('./links.js').LinksManager} linksManager Links manager with
 * current data.
 * @param {Record<string, unknown>} config Site configuration.
 * @param {URL} root Base URL to resolve template paths.
 * @param {string} siteDir Site root directory.
 * @param {string} pagePath Absolute path to the source file, used for errors.
 * @returns {Promise<{doc: import('@b-fuze/deno-dom').DOMDocument, templatesUsed: string[], scriptsUsed: string[], svgsUsed: string[]}>}
 * DOM document and dependency information.
 */
export async function buildDocument(
  page,
  linksManager,
  config,
  root,
  siteDir,
  pagePath,
) {
  const parser = new DOMParser();
  const doc = parser.parseFromString("<html></html>", "text/html");
  if (!doc) throw new Error(`${pagePath}: invalid HTML`);

  // Track template dependencies, including the blog content template when used
  const templatesUsed = [];

  // Apply blog content template to pages under /blog/ directory
  const relPath = relative(siteDir, pagePath).replace(/\\/g, "/");
  if (relPath.startsWith("blog/")) {
    const blogModule = await importTemplate(
      "blog",
      "default",
      root,
      siteDir,
      templatesUsed,
    );
    page.html = blogModule.render({ html: page.html });
  }

  const moreTemplates = await applyTemplates(
    doc,
    page,
    linksManager.data,
    config,
    root,
    siteDir,
  );
  templatesUsed.push(...moreTemplates);

  const body = doc.querySelector("body");
  if (!body) throw new Error(`${pagePath}: missing <body> element`);

  for (const src of page.scripts.modules ?? []) {
    const script = doc.createElement("script");
    script.setAttribute("type", "module");
    script.setAttribute("src", src);
    body.appendChild(script);
  }

  const scriptsUsed = [];
  for (const file of page.scripts.inline ?? []) {
    const scriptPath = join(siteDir, file);
    let realPath;
    try {
      realPath = await Deno.realPath(scriptPath);
    } catch {
      realPath = scriptPath;
    }
    let content;
    try {
      content = await Deno.readTextFile(realPath);
    } catch (err) {
      if (err instanceof Error) err.message = `${realPath}: ${err.message}`;
      throw err;
    }
    scriptsUsed.push(realPath);
    const script = doc.createElement("script");
    script.textContent = content;
    body.appendChild(script);
  }

  const svgsUsed = await inlineSvg(doc, toFileUrl(siteDir + "/"));
  return { doc, templatesUsed, scriptsUsed, svgsUsed };
}
