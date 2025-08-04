import { getEmoji } from "./emoji.js";

/**
 * Map of page paths to their template, SVG, inline script, CSS, module script,
 * and `links` front-matter dependencies.
 * @type {Map<
 *   string,
 *   {
 *     templates: Set<string>,
 *     svgs: Set<string>,
 *     scripts: Set<string>,
 *     css: Set<string>,
 *     modules: Set<string>,
 *     links: boolean,
 *   }
 * >}
 */
export const pageDeps = new Map();

/**
 * @typedef {Record<string, string[] | boolean> & {pagePath: string}} PageDeps
 * @property {string} pagePath Path to the HTML page.
 * @property {string[]} [templatesUsed] Template files referenced by the page.
 * @property {string[]} [svgsUsed] SVG files referenced by the page.
 * @property {string[]} [scriptsUsed] Inline script files referenced by the page.
 * @property {string[]} [cssUsed] CSS files referenced by the page.
 * @property {string[]} [modulesUsed] External module scripts referenced by the page.
 * @property {boolean} [linksUsed] Whether the page includes `[links]` front matter.
 */

/**
 * Record the dependencies used when rendering a page.
 *
 * @param {Record<string, string[]> & {pagePath: string}} deps See {@link PageDeps} for property descriptions.
 * @returns {void}
 */
export function recordPageDeps({
  pagePath,
  templatesUsed = [],
  svgsUsed = [],
  scriptsUsed = [],
  cssUsed = [],
  modulesUsed = [],
  linksUsed = false,
}) {
  if (pagePath === undefined) {
    throw new Error(`no argument passed to recordPageDeps`);
  }
  pageDeps.set(pagePath, {
    templates: new Set(templatesUsed),
    svgs: new Set(svgsUsed),
    scripts: new Set(scriptsUsed),
    css: new Set(cssUsed),
    modules: new Set(modulesUsed),
    links: linksUsed,
  });
}

/**
 * Get a list of pages that depend on a given template file.
 *
 * @param {string} templatePath Path to the template file.
 * @returns {string[]} Array of page paths using the template.
 */
export function pagesUsingTemplate(templatePath) {
  const out = [];
  const target = normalizeTemplatePath(templatePath);
  for (const [page, deps] of pageDeps) {
    for (const t of deps.templates) {
      if (normalizeTemplatePath(t) === target) {
        out.push(page);
        break;
      }
    }
  }
  return out;
}

/**
 * Reduce a template path to a canonical `slot/name.js` form.
 *
 * This allows project templates and their core fallbacks to be treated as the
 * same dependency when looking up pages that need to be re-rendered.
 *
 * @param {string} path Absolute template file path.
 * @returns {string} Normalized relative path.
 */
function normalizeTemplatePath(path) {
  const p = path.replace(/\\/g, "/");
  const tplIdx = p.indexOf("/templates/");
  if (tplIdx !== -1) return p.slice(tplIdx + 11);
  const coreIdx = p.indexOf("/core/templates/");
  if (coreIdx !== -1) return p.slice(coreIdx + 16);
  return p;
}

/**
 * Get a list of pages that inline a given SVG file.
 *
 * @param {string} svgPath Path to the SVG file.
 * @returns {string[]} Array of page paths referencing the SVG.
 */
export function pagesUsingSvg(svgPath) {
  const out = [];
  let realPath;
  try {
    realPath = Deno.realPathSync(svgPath);
  } catch {
    realPath = svgPath;
  }
  const relativePath = realPath.split("/src-svg/")[1] || realPath;
  console.log(`  ${getEmoji("trace")} looking for ${relativePath}...`);
  for (const [page, { svgs }] of pageDeps) {
    if (svgs.has(realPath)) out.push(page);
  }
  return out;
}

/**
 * Get a list of pages that inline a given script file.
 *
 * @param {string} scriptPath Path to the inline script file.
 * @returns {string[]} Array of page paths referencing the script.
 */
export function pagesUsingScript(scriptPath) {
  const out = [];
  let realPath;
  try {
    realPath = Deno.realPathSync(scriptPath);
  } catch {
    realPath = scriptPath;
  }
  for (const [page, { scripts }] of pageDeps) {
    if (scripts.has(realPath)) out.push(page);
  }
  return out;
}

/**
 * Get a list of pages that reference a given CSS file.
 *
 * @param {string} cssPath Path to the CSS file.
 * @returns {string[]} Array of page paths referencing the CSS file.
 */
export function pagesUsingCss(cssPath) {
  const out = [];
  let realPath;
  try {
    realPath = Deno.realPathSync(cssPath);
  } catch {
    realPath = cssPath;
  }
  for (const [page, { css }] of pageDeps) {
    if (css.has(realPath)) out.push(page);
  }
  return out;
}

/**
 * Get a list of pages that reference a given external module script.
 *
 * @param {string} modulePath Path to the module script file.
 * @returns {string[]} Array of page paths referencing the module script.
 */
export function pagesUsingModule(modulePath) {
  const out = [];
  let realPath;
  try {
    realPath = Deno.realPathSync(modulePath);
  } catch {
    realPath = modulePath;
  }
  for (const [page, { modules }] of pageDeps) {
    if (modules.has(realPath)) out.push(page);
  }
  return out;
}

/**
 * Get a list of pages that declare `[links]` front matter.
 *
 * @returns {string[]} Array of page paths with link metadata.
 */
export function pagesWithLinks() {
  const out = [];
  for (const [page, { links }] of pageDeps) {
    if (links) out.push(page);
  }
  return out;
}

/**
 * Clear all recorded page dependencies.
 * @returns {void}
 */
export function clearPageDeps() {
  pageDeps.clear();
}
