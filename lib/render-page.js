import { dirname, join, relative, toFileUrl, fromFileUrl } from "@std/path";
import { hashAssetName } from "./hash-asset.js";
import { copyAsset } from "./copy-asset.js";
import { DOMParser } from "@b-fuze/deno-dom";
import { parsePage } from "./parse-page.js";
import { LinksManager } from "./links.js";
import { applyTemplates } from "./apply-templates.js";
import { inlineSvg } from "./inline-svg.js";
import { getEmoji } from "./emoji.js";
import { markdownToHTML } from "./markdown.js";

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

    const siteDir = await findSiteRoot(path);
    const configPath = join(siteDir, "config.json");
    const configText = await Deno.readTextFile(configPath);
    const config = JSON.parse(configText);
    const distant = String(config.distantDirectory);
    const pretty = Boolean(config.prettyUrls);
    const hashAssets = Boolean(config.hashAssets);

    const cssUsed = [];
    const cssFiles = page.frontMatter.css ?? [];
    page.frontMatter.css = await Promise.all(
      cssFiles.map(async (href) => {
        const relHref = href.startsWith("/") ? href.slice(1) : href;
        const abs = join(siteDir, relHref);
        try {
          const real = await Deno.realPath(abs);
          cssUsed.push(real);
          if (!hashAssets) return href;
          const hashed = await hashAssetName(real);
          const dirRel = dirname(relHref);
          const relPath = (dirRel === "." ? hashed : join(dirRel, hashed))
            .replace(/\\/g, "/");
          return href.startsWith("/") ? "/" + relPath : relPath;
        } catch {
          const corePath = fromFileUrl(
            new URL(`../core/css/${relHref}`, import.meta.url),
          );
          try {
            await Deno.stat(corePath);
            cssUsed.push(abs);
            if (hashAssets) {
              const hashed = await hashAssetName(corePath);
              const dirRel = dirname(relHref);
              const relPath = (dirRel === "." ? hashed : join(dirRel, hashed))
                .replace(/\\/g, "/");
              await copyAsset(abs);
              return href.startsWith("/") ? "/" + relPath : relPath;
            }
            await copyAsset(abs);
            return href;
          } catch {
            console.log(`${getEmoji("error")} CSS missing -- ${relHref}`);
            cssUsed.push(abs);
            return href;
          }
        }
      }),
    );
    const modulesUsed = [];
    const moduleFiles = page.scripts.modules ?? [];
    page.scripts.modules = await Promise.all(
      moduleFiles.map(async (src) => {
        const relSrc = src.startsWith("/") ? src.slice(1) : src;
        const abs = join(siteDir, relSrc);
        let real;
        try {
          real = await Deno.realPath(abs);
        } catch {
          real = abs;
        }
        modulesUsed.push(real);
        if (!hashAssets) return src;
        const hashed = await hashAssetName(abs);
        const dirRel = dirname(relSrc);
        const relPath = (dirRel === "." ? hashed : join(dirRel, hashed))
          .replace(/\\/g, "/");
        return src.startsWith("/") ? "/" + relPath : relPath;
      }),
    );

    const linksManager = new LinksManager(join(siteDir, "links.json"));
    await linksManager.load();
    const rel = relative(siteDir, path).replace(/\\/g, "/");
    const href = toHref(rel, pretty);
    const linksUsed = page.frontMatter.links !== undefined;
    // Always merge so links are pruned when omitted from the page.
    const linksChanged = linksManager.merge(href, page.links ?? {});
    if (linksChanged) await linksManager.save();

    const parser = new DOMParser();
    // Build a minimal document. Templates are responsible for generating
    // the final <head> and <body> structure.
    const doc = parser.parseFromString("<html></html>", "text/html");
    if (!doc) throw new Error(`${path}: invalid HTML`);

    const templatesUsed = await applyTemplates(
      doc,
      page,
      linksManager.data,
      config,
      root,
    );

    const body = doc.querySelector("body");
    if (!body) throw new Error(`${path}: missing <body> element`);

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

    const outRel = toOutRel(rel, pretty);
    const outPath = join(distant, outRel);
    await Deno.mkdir(dirname(outPath), { recursive: true });
    const htmlOut = "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
    await Deno.writeTextFile(outPath, htmlOut);

    const fmtCmd = new Deno.Command(Deno.execPath(), {
      args: ["fmt", outPath],
      stdout: "null",
      stderr: "piped",
    });
    const { code, stderr } = await fmtCmd.output();
    if (code !== 0) {
      throw new Error(
        `${outPath}: ${new TextDecoder().decode(stderr).trim()}`,
      );
    }

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

/**
 * Build the href used in `links.json` for a page.
 *
 * @param {string} rel Page path relative to the site root.
 * @param {boolean} pretty Whether `.html` extensions should be omitted.
 * @returns {string} Href beginning with a leading slash.
 */
function toHref(rel, pretty) {
  const normalized = rel.replace(/\\/g, "/").replace(/\.(md|html?)$/i, ".html");
  if (!pretty) return "/" + normalized;
  return "/" +
    normalized.replace(/index\.html$/i, "").replace(/\.html$/i, "/");
}

/**
 * Determine output file path relative to the distant directory.
 *
 * @param {string} rel Page path relative to the site root.
 * @param {boolean} pretty When true, preserve the original file structure
 * without creating nested `index.html` directories.
 * @returns {string} Relative output path within the distant directory.
 */
function toOutRel(rel, pretty) {
  const normalized = rel.replace(/\\/g, "/");
  if (pretty) {
    // Ensure the file keeps a `.html` extension without nesting it under an
    // additional directory. Previously this would transform `foo.html` into
    // `foo/index.html` which broke references to the generated file.
    return normalized.replace(/\.(md|html?)$/i, ".html");
  }
  return normalized.replace(/\.(md|html?)$/i, "") + ".html";
}

/**
 * Walk up the directory hierarchy to find the site root containing `config.json`.
 *
 * @param {string} filePath Starting path used to search for the site root.
 * @returns {Promise<string>} Directory path containing `config.json`.
 */
async function findSiteRoot(filePath) {
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
