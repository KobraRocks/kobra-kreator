
import { fromFileUrl } from "@std/path";

/**
 * Dynamically import a template module, with cache-busting and fallback to core templates.
 */
export async function importTemplate(slot, name, root, used) {
  let moduleUrl = new URL(`templates/${slot}/${name}.js`, root);
  let module;

  try {
    // Bust cache for project templates
    module = await import(`${moduleUrl.href}?t=${Date.now()}`);
    used.push(fromFileUrl(moduleUrl));
  } catch (err) {
    if (
      err instanceof Deno.errors.NotFound ||
      (err.message && err.message.includes("Module not found"))
    ) {
      // Fallback to core templates
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
          (err2.message && err2.message.includes("Module not found"))
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
  return module;
}

/**
 * Ensure the document has an <html> element.
 */
export function ensureHtmlRoot(doc) {
  if (!doc.documentElement) {
    const htmlEl = doc.createElement("html");
    doc.appendChild(htmlEl);
  }
}

/**
 * Render a set of templates defined as an object mapping slot->(string|{name,priority}).
 */
export async function renderSlots(defs, frontMatter, links, config, root, used) {
  const parts = [];

  for (const [slot, def] of Object.entries(defs)) {
    let name;
    let priority = 0;

    if (typeof def === "string") {
      name = def;
    } else if (def && typeof def === "object") {
      ({ name, priority = 0 } = def);
    } else {
      continue;
    }
    if (!name) continue;

    const module = await importTemplate(slot, name, root, used);
    const html = module.render({ frontMatter, links, config });
    if (typeof html !== "string") {
      throw new Error(
        `Template ${slot}/${name} render() must return a string`,
      );
    }

    if (typeof priority !== "number" || isNaN(priority)) {
      throw new Error(
        `Priority for template ${slot}/${name} must be a number`,
      );
    }

    parts.push({ slot, html, priority });
  }

  return parts;
}

/**
 * Resolve template names from front matter and inject rendered HTML.
 *
 * Supports:
 * - frontMatter.templates: fixed slots (head, nav, header, footer)
 * - frontMatter.templates.before: arbitrary slots before main content, ordered by priority
 * - frontMatter.templates.after: arbitrary slots after main content, ordered by priority
 */
export async function applyTemplates(
  doc,
  page,
  links,
  config,
  root = new URL("..", import.meta.url),
) {
  const { frontMatter, html } = page;
  const used = [];

  ensureHtmlRoot(doc);

  const templates = frontMatter.templates || {};

  // Fixed slots in known order
  const fixedDefs = {
    head: templates.head,
    nav: templates.nav,
    header: templates.header,
    footer: templates.footer,
  };
  const fixedParts = {};

  for (const slot of Object.keys(fixedDefs)) {
    const name = fixedDefs[slot];
    if (!name) continue;
    const module = await importTemplate(slot, name, root, used);
    const partHtml = module.render({ frontMatter, links, config });
    if (typeof partHtml !== "string") {
      throw new Error(
        `Template ${slot}/${name} render() must return a string`,
      );
    }
    fixedParts[slot] = partHtml;
  }

  // Before and after slots
  const beforeDefs = templates.before || {};
  const afterDefs = templates.after || {};

  const beforeParts = await renderSlots(
    beforeDefs,
    frontMatter,
    links,
    config,
    root,
    used,
  );
  const afterParts = await renderSlots(
    afterDefs,
    frontMatter,
    links,
    config,
    root,
    used,
  );

  // Build the document
  const headEl = doc.createElement("head");
  doc.documentElement.prepend(headEl);
  headEl.innerHTML = fixedParts.head || "";

  const bodyEl = doc.createElement("body");
  doc.documentElement.appendChild(bodyEl);

  const navHtml = fixedParts.nav || "";
  const headerHtml = fixedParts.header || "";
  const footerHtml = fixedParts.footer || "";

  // Sort by descending priority
  beforeParts.sort((a, b) => b.priority - a.priority);
  afterParts.sort((a, b) => b.priority - a.priority);

  const beforeHtml = beforeParts.map((p) => p.html).join("");
  const afterHtml = afterParts.map((p) => p.html).join("");

  bodyEl.innerHTML = `
    ${navHtml}
    ${headerHtml}
    <main>
      ${beforeHtml}
      ${html}
      ${afterHtml}
    </main>
    ${footerHtml}
  `;

  return used;
}

