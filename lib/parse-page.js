import { parse as parseToml } from "@std/toml";
import { logWithEmoji } from "./emoji.js";
import { hasFrontMatterHandler } from "./front-matter-handlers.js";
import { markdownToHTML } from "../plugins/markdown.js";

const TOP_LEVEL_KEYS = [
  "title",
  "description",
  "css",
  "templates",
  "scripts",
  "links",
];
const TEMPLATE_KEYS = ["head", "nav", "footer"];
const SCRIPT_KEYS = ["modules", "inline"];
const LINK_SECTIONS = ["nav", "footer"];
const NAV_LINK_KEYS = ["topLevel", "subLevel", "label"];
const FOOTER_LINK_KEYS = ["column", "label"];

/**
 * @typedef {object} ParsedPage
 * @property {Record<string, unknown>} frontMatter Parsed front-matter data.
 * @property {Record<string, string>} templates Template names extracted from front-matter.
 * @property {Record<string, unknown>} scripts Script references extracted from front-matter.
 * @property {Record<string, unknown>} links Link metadata extracted from front-matter.
 * @property {Record<string, unknown>} [unvalidatedFrontMatter] Unvalidated key-value pairs for registered handlers.
 * @property {string} html Remaining HTML after the front-matter separator.
 */

/**
 * Parse a page containing TOML front-matter.
 *
 * Accepts either a file path or an object specifying the path, raw content,
 * and extension. When only a path is provided the file is read from disk. The
 * file is split at `#---#`, the first segment is parsed as TOML, and the
 * remaining segment becomes the HTML body. Markdown sources are converted to
 * HTML when the extension is `.md` or `.markdown`.
 *
 * @param {string | {path?: string, raw?: string, extension?: string}} input
 *   Path or configuration object describing the page to parse.
 * @returns {Promise<ParsedPage>} Parsed front-matter and HTML content.
 */
export async function parsePage(input) {
  let path = "";
  let raw = "";
  let extension = ".html";

  if (typeof input === "string") {
    path = input;
  } else if (typeof input === "object" && input) {
    ({ path = "", raw = "", extension = ".html" } = input);
  }

  if (!raw && path) {
    raw = await Deno.readTextFile(path);
    const dot = path.lastIndexOf(".");
    if (dot !== -1) extension = path.slice(dot).toLowerCase();
  }

  const separator = "#---#";
  const idx = raw.indexOf(separator);
  if (idx === -1) {
    throw new Error(`${path}: missing \"${separator}\" separator`);
  }
  const tomlText = raw.slice(0, idx).trim();
  const rawContent = raw.slice(idx + separator.length);

  let html = rawContent;
  if (extension === ".md" || extension === ".markdown") {
    html = markdownToHTML(rawContent);
  }

  let frontMatter = {};
  if (tomlText.length > 0) {
    try {
      frontMatter = parseToml(tomlText);
    } catch (err) {
      if (err instanceof Error) {
        err.message = `${path}: ${err.message}`;
      }
      throw err;
    }
  }

  const extra = validateFrontMatter(frontMatter, path);
  return {
    frontMatter,
    templates: frontMatter.templates ?? {},
    scripts: frontMatter.scripts ?? {},
    links: frontMatter.links ?? {},
    html,
    unvalidatedFrontMatter: extra,
  };
}

/**
 * Validate the structure and values of the parsed front-matter object.
 *
 * @param {Record<string, unknown>} fm Parsed front-matter data.
 * @param {string} path Path to the file being processed (for error messages).
 * @returns {Record<string, unknown>} Unvalidated key-value pairs handled later.
 */
function validateFrontMatter(fm, path) {
  const extra = {};
  for (const key of Object.keys(fm)) {
    if (!TOP_LEVEL_KEYS.includes(key)) {
      if (hasFrontMatterHandler(key)) {
        extra[key] = fm[key];
        delete fm[key];
        continue;
      }
      logWithEmoji(
        "warning",
        `${path}: unknown front-matter key \"${key}\"`,
      );
    }
  }

  if (typeof fm.title !== "string") {
    throw new Error(`${path}: \"title\" is required and must be a string`);
  }
  if (fm.description !== undefined && typeof fm.description !== "string") {
    throw new Error(`${path}: \"description\" must be a string`);
  }
  if (fm.css !== undefined) {
    if (!Array.isArray(fm.css) || fm.css.some((v) => typeof v !== "string")) {
      throw new Error(`${path}: \"css\" must be an array of strings`);
    }
  }

  const templates = fm.templates;
  if (typeof templates !== "object" || templates === null) {
    throw new Error(`${path}: \"templates\" table is required`);
  }
  for (const key of Object.keys(templates)) {
    if (!TEMPLATE_KEYS.includes(key)) {
      logWithEmoji(
        "warning",
        `${path}: unknown \"templates.${key}\" key`,
      );
    }
  }
  if (typeof templates.head !== "string") {
    throw new Error(
      `${path}: \"templates.head\" is required and must be a string`,
    );
  }
  if (templates.nav !== undefined && typeof templates.nav !== "string") {
    throw new Error(`${path}: \"templates.nav\" must be a string`);
  }
  if (templates.footer !== undefined && typeof templates.footer !== "string") {
    throw new Error(`${path}: \"templates.footer\" must be a string`);
  }

  const scripts = fm.scripts;
  if (scripts !== undefined) {
    if (typeof scripts !== "object" || scripts === null) {
      throw new Error(`${path}: \"scripts\" must be a table`);
    }
    for (const key of Object.keys(scripts)) {
      if (!SCRIPT_KEYS.includes(key)) {
        logWithEmoji(
          "warning",
          `${path}: unknown \"scripts.${key}\" key`,
        );
      }
    }
    if (scripts.modules !== undefined) {
      if (
        !Array.isArray(scripts.modules) ||
        scripts.modules.some((v) => typeof v !== "string")
      ) {
        throw new Error(
          `${path}: \"scripts.modules\" must be an array of strings`,
        );
      }
    }
    if (scripts.inline !== undefined) {
      if (
        !Array.isArray(scripts.inline) ||
        scripts.inline.some((v) => typeof v !== "string")
      ) {
        throw new Error(
          `${path}: \"scripts.inline\" must be an array of strings`,
        );
      }
      for (const file of scripts.inline) {
        if (!file.endsWith(".inline.js")) {
          throw new Error(
            `${path}: \"scripts.inline\" entries must end with .inline.js`,
          );
        }
      }
    }
  }

  const links = fm.links;
  if (links !== undefined) {
    if (typeof links !== "object" || links === null) {
      throw new Error(`${path}: \"links\" must be a table`);
    }
    for (const key of Object.keys(links)) {
      if (!LINK_SECTIONS.includes(key)) {
        logWithEmoji(
          "warning",
          `${path}: unknown \"links.${key}\" key`,
        );
      }
    }

    const nav = links.nav;
    if (nav !== undefined) {
      if (typeof nav !== "object" || nav === null) {
        throw new Error(`${path}: \"links.nav\" must be a table`);
      }
      for (const key of Object.keys(nav)) {
        if (!NAV_LINK_KEYS.includes(key)) {
          logWithEmoji(
            "warning",
            `${path}: unknown \"links.nav.${key}\" key`,
          );
        }
      }
      if (nav.topLevel !== undefined && typeof nav.topLevel !== "boolean") {
        throw new Error(`${path}: \"links.nav.topLevel\" must be a boolean`);
      }
      if (nav.subLevel !== undefined && typeof nav.subLevel !== "string") {
        throw new Error(`${path}: \"links.nav.subLevel\" must be a string`);
      }
      if (nav.label !== undefined && typeof nav.label !== "string") {
        throw new Error(`${path}: \"links.nav.label\" must be a string`);
      }
    }

    const footer = links.footer;
    if (footer !== undefined) {
      if (typeof footer !== "object" || footer === null) {
        throw new Error(`${path}: \"links.footer\" must be a table`);
      }
      for (const key of Object.keys(footer)) {
        if (!FOOTER_LINK_KEYS.includes(key)) {
        logWithEmoji(
          "warning",
          `${path}: unknown \"links.footer.${key}\" key`,
        );
        }
      }
      if (footer.column !== undefined && typeof footer.column !== "string") {
        throw new Error(`${path}: \"links.footer.column\" must be a string`);
      }
      if (footer.label !== undefined && typeof footer.label !== "string") {
        throw new Error(`${path}: \"links.footer.label\" must be a string`);
      }
    }
  }
  return extra;
}
