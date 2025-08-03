import { getEmoji } from "./emoji.js";

/**
 * Map of page paths to their template, SVG, and inline script dependencies.
 * @type {Map<string, {templates: Set<string>, svgs: Set<string>, scripts: Set<string>}>}
 */
export const pageDeps = new Map();

/**
 * Record the dependencies used when rendering a page.
 *
 * @param {string} pagePath Path to the HTML page.
 * @param {string[]} [templates] Template files referenced by the page.
 * @param {string[]} [svgs] SVG files referenced by the page.
 * @param {string[]} [scripts] Inline script files referenced by the page.
 * @returns {void}
 */
export function recordPageDeps(
  pagePath,
  templates = [],
  svgs = [],
  scripts = [],
) {
  pageDeps.set(pagePath, {
    templates: new Set(templates),
    svgs: new Set(svgs),
    scripts: new Set(scripts),
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
  for (const [page, deps] of pageDeps) {
    if (deps.templates.has(templatePath)) out.push(page);
  }
  return out;
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
 * Clear all recorded page dependencies.
 * @returns {void}
 */
export function clearPageDeps() {
  pageDeps.clear();
}
