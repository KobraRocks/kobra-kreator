import { dirname, join, relative, toFileUrl } from "@std/path";
import { DOMParser } from "@b-fuze/deno-dom";
import { parsePage } from "./parse-page.js";
import { LinksManager } from "./links.js";
import { applyTemplates } from "./apply-templates.js";
import { inlineSvg } from "./inline-svg.js";
import { recordPageDeps } from "./page-deps.js";

export async function renderPage(path, root = new URL("..", import.meta.url)) {
  try {
    const page = await parsePage(path);

    const siteDir = await findSiteRoot(path);
    const configPath = join(siteDir, "config.json");
    const configText = await Deno.readTextFile(configPath);
    const config = JSON.parse(configText);
    const distant = String(config.distantDirectory);

    const linksManager = new LinksManager(join(siteDir, "links.json"));
    await linksManager.load();
    const rel = relative(siteDir, path).replace(/\\/g, "/");
    if (Object.keys(page.links).length > 0) {
      const href = "/" + rel;
      const changed = linksManager.merge(href, page.links);
      if (changed) await linksManager.save();
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(page.html, "text/html");
    if (!doc) throw new Error(`${path}: invalid HTML`);

    const templatesUsed = await applyTemplates(
      doc,
      page.frontMatter,
      linksManager.data,
      root,
    );

    let head = doc.head;
    if (!head) {
      head = doc.createElement("head");
      doc.documentElement.prepend(head);
    }
    const body = doc.body;
    if (!body) throw new Error(`${path}: Document missing <body>`);

    for (const src of page.scripts.modules ?? []) {
      const script = doc.createElement("script");
      script.setAttribute("type", "module");
      script.setAttribute("src", src);
      body.appendChild(script);
    }

    for (const file of page.scripts.inline ?? []) {
      const scriptPath = join(siteDir, file);
      let content;
      try {
        content = await Deno.readTextFile(scriptPath);
      } catch (err) {
        if (err instanceof Error) err.message = `${scriptPath}: ${err.message}`;
        throw err;
      }
      const script = doc.createElement("script");
      script.textContent = content;
      body.appendChild(script);
    }

    const svgsUsed = await inlineSvg(doc, toFileUrl(siteDir + "/"));

    const outRel = rel.replace(/\\/g, "/").replace(/\.html?$/i, "") + ".html";
    const outPath = join(distant, outRel);
    await Deno.mkdir(dirname(outPath), { recursive: true });
    const htmlOut = "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
    await Deno.writeTextFile(outPath, htmlOut);

    recordPageDeps(path, templatesUsed, svgsUsed);

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
  } catch (err) {
    if (err instanceof Error) {
      if (!err.message.includes(path)) {
        err.message = `${path}: ${err.message}`;
      }
      console.error(err);
    } else {
      console.error(err);
    }
  }
}

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
