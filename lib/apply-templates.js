import { fromFileUrl } from "@std/path";

/**
 * @typedef {object} FrontMatter
 * @property {string} title - Page title.
 * @property {{head: string, nav?: string, footer?: string}} templates - Template selections.
 */

/**
 * @typedef {object} NavLink
 * @property {string} href
 * @property {string} label
 * @property {boolean} [topLevel]
 * @property {string} [subLevel]
 */

/**
 * @typedef {object} FooterLink
 * @property {string} href
 * @property {string} label
 * @property {string} column
 */

/**
 * @typedef {object} LinksJson
 * @property {NavLink[]} nav
 * @property {FooterLink[]} footer
 */

/**
 * @typedef {object} Config
 * @property {string} distantDirectory - Absolute output path.
 * @property {boolean} [prettyUrls]
 * @property {boolean} [hashAssets]
 * @property {string} [copyright]
 */

/**
 * Resolve template names from front matter and inject rendered HTML.
 *
 * @param {Document} doc       DOM document to mutate.
 * @param {FrontMatter} frontMatter Parsed front-matter object.
 * @param {LinksJson} links       Parsed links.json object.
 * @param {Config} config       Rendering configuration.
 * @param {URL} [root]         Base directory for templates as a file URL.
 * @returns {Promise<string[]>} Paths of templates used during rendering.
 */
export async function applyTemplates(
  doc,
  frontMatter,
  links,
  config,
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
      // Bust the module cache so newly created or modified templates are
      // loaded fresh on every render. Without this, Deno would reuse the
      // previously cached result and ignore user overrides.
      module = await import(`${moduleUrl.href}?t=${Date.now()}`);
      used.push(fromFileUrl(moduleUrl));
    } catch (err) {
      if (
        err instanceof Deno.errors.NotFound ||
        (err && err.message && err.message.includes("Module not found"))
      ) {
        // When a project template is missing, attempt to load the same
        // template name from the bundled core templates. This allows pages
        // to continue rendering when a template is renamed or deleted, while
        // still surfacing an error if no fallback exists.
        moduleUrl = new URL(
          `../core/templates/${slot}/${name}.js`,
          import.meta.url,
        );
        try {
          module = await import(moduleUrl.href);
          used.push(fromFileUrl(moduleUrl));
        } catch (err2) {
          if (
            err2 instanceof Deno.errors.NotFound ||
            (err2 && err2.message && err2.message.includes("Module not found"))
          ) {
            throw new Error(
              `Template ${slot}/${name}.js not found in project or core directories`,
            );
          }
          throw err2;
        }
      } else {
        throw err;
      }
    }
    if (typeof module.render !== "function") {
      throw new Error(`Template ${slot}/${name} does not export render()`);
    }
    const html = module.render({ frontMatter, links, config });
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
