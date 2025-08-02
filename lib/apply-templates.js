/**
 * Resolve template names from front matter and inject rendered HTML.
 *
 * @param {Document} doc       - DOM document to mutate.
 * @param {object} frontMatter - Parsed front-matter object.
 * @param {object} links       - Parsed links.json object.
 * @param {URL} [root]         - Base directory for templates as a file URL.
 */
export async function applyTemplates(doc, frontMatter, links, root = new URL("..", import.meta.url)) {
  const slots = ["head", "nav", "footer"];
  const templates = frontMatter.templates || {};

  for (const slot of slots) {
    const name = templates[slot];
    if (!name) continue;

    const moduleUrl = new URL(`templates/${slot}/${name}.js`, root);
    const module = await import(moduleUrl.href);
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
}

