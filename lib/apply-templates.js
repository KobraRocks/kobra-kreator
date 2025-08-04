/**
 * Resolve template names from front matter and inject rendered HTML.
 *
 * @param {Document} doc       - DOM document to mutate.
 * @param {object} frontMatter - Parsed front-matter object.
 * @param {object} links       - Parsed links.json object.
 * @param {URL} [root]         - Base directory for templates as a file URL.
 */
import { fromFileUrl } from "@std/path";

/**
 * Resolve template names from front matter and inject rendered HTML.
 *
 * @param {Document} doc       DOM document to mutate.
 * @param {object} frontMatter Parsed front-matter object.
 * @param {object} links       Parsed links.json object.
 * @param {URL} [root]         Base directory for templates as a file URL.
 * @returns {Promise<string[]>} Paths of templates used during rendering.
 */
export async function applyTemplates(
  doc,
  frontMatter,
  links,
  root = new URL("..", import.meta.url),
) {
  const slots = ["head", "nav", "footer"];
  const templates = frontMatter.templates || {};
  const used = [];

  if (!doc.documentElement) {
    const htmlEl = doc.createElement("html");
    doc.appendChild(htmlEl);
  }

  for (const slot of slots) {
    const name = templates[slot];
    if (!name) continue;

    let moduleUrl = new URL(`templates/${slot}/${name}.js`, root);
    let module;
    try {
      module = await import(moduleUrl.href);
      used.push(fromFileUrl(moduleUrl));
    } catch (err) {
      if (
        err instanceof Deno.errors.NotFound ||
        (err && err.message && err.message.includes("Module not found"))
      ) {
        // Fallback to built-in defaults when project templates are missing.
        moduleUrl = new URL(
          `../core/templates/${slot}/default.js`,
          import.meta.url,
        );
        module = await import(moduleUrl.href);
        used.push(fromFileUrl(moduleUrl));
      } else {
        throw err;
      }
    }
    if (typeof module.render !== "function") {
      throw new Error(`Template ${slot}/${name} does not export render()`);
    }
    const html = module.render({ frontMatter, links });
    if (typeof html !== "string") {
      throw new Error(`Template ${slot}/${name} render() must return a string`);
    }

    if (slot === "head") {
      let head = doc.head;
      if (!head) {
        head = doc.createElement("head");
        doc.documentElement.prepend(head);
      }
      head.innerHTML = html + head.innerHTML;
    } else if (slot === "nav") {
      const body = doc.body;
      if (!body) throw new Error("Document missing <body>");
      body.innerHTML = html + body.innerHTML;
    } else if (slot === "footer") {
      const body = doc.body;
      if (!body) throw new Error("Document missing <body>");
      body.innerHTML = body.innerHTML + html;
    }
  }

  return used;
}
