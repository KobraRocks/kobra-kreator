# 05 – Templates API

Templates are **plain ECMAScript modules** that live under the shared
`/templates/` directory. They generate reusable page fragments—`<head>`, `<nav>`,
and `<footer>`—based on each page’s front‑matter and the site’s central
`links.json`.

> **TL;DR**: export a `render()` function that returns an HTML string.

---

## 1. Folder structure

```text
/templates/
  head/
    default.js        # <head> content shared by most pages
    blog.js           # <head> variant used by blog posts
  nav/
    default.js        # site‑wide navigation bar
  footer/
    default.js        # global footer
```

*The generator maps the `frontMatter.templates.X` key to
`/templates/X/<NAME>.js`, where `X ∈ { head, nav, footer }`.*

---

## 2. Module contract

```javascript
/**
 * Render a page fragment.
 *
 * @param {Object} params             – injected by the build system
 * @param {FrontMatter} params.frontMatter – parsed TOML object for the page
 * @param {LinksJson}  params.links        – contents of links.json for the site
 * @returns {string}                    – raw HTML that will be inserted verbatim
 */
export function render({ frontMatter, links }) {
  // build HTML string here – any template engine / tagged literal is fine
  return `\n<meta charset="utf-8">\n<title>${frontMatter.title}</title>\n`;
}
```

### Rules

1. **Synchronous return** – `render()` must return a *string*, *not* a
   `Promise`.  <!-- TODO: evaluate allowing async template rendering in v2. -->
2. **No side‑effects** – Templates should be *pure* functions; they must **not**
   modify global state or perform network requests (keep builds deterministic).
3. **No outer wrappers** –

   * *Head* templates: emit raw tags (e.g. `<meta>`, `<link>`, `<script>`), **not**
     the `<head>` itself.
   * *Nav* / *Footer* templates: include the `<nav>` or `<footer>` element in the
     output—you control its classes/ARIA attributes.  
4. **Asset paths** – Use the same path rules described in
   [04-front‑matter](04-front-matter.md) (relative to site root or external
   URL).

---

## 3. Example implementations

### 3.1 Head / `default.js`

```javascript
export function render({ frontMatter }) {
  const cssLinks = (frontMatter.css || [])
    .map(href => `<link rel="stylesheet" href="${href}">`)
    .join("\n");

  return `\n<meta charset="utf-8">\n<title>${frontMatter.title}</title>\n${cssLinks}`;
}
```

### 3.2 Nav / `default.js`

```javascript
export function render({ links }) {
  const items = links.nav
    .filter(l => l.topLevel)
    .map(l => `<li><a href="${l.href}">${l.label}</a></li>`)  // TODO: handle subLevel buckets
    .join("\n");

  return `<nav class="site-nav"><ul>${items}</ul></nav>`;
}
```

### 3.3 Footer / `default.js`

```javascript
export function render({ links }) {
  const columns = links.footer.reduce((acc, item) => {
    (acc[item.column] ||= []).push(item);
    return acc;
  }, {});

  return `<footer>${Object.entries(columns)
    .map(([col, items]) =>
      `<div class="foot-col"><h3>${col}</h3>${items
        .map(i => `<a href="${i.href}">${i.label}</a>`)  // TODO: template for inner links
        .join("")}</div>`)
    .join("")}</footer>`;
}
```

---

## 4. Access to utilities (planned)

We may expose a small helper bundle (e.g. `escapeHtml`, `slugify`) via a third
parameter or named import.

<!-- TODO: design utilities object and document how to import/use it. -->

---

## 5. Error handling

* If a template **throws**, the build logs the error and halts—better fail fast
  than produce broken markup.
* Missing template file → build error with clear path hint.

  <!-- TODO: consider fallback to `default.js` if missing. -->

---

## 6. Versioning & breaking changes

The API above is considered **v1**. Any breaking change (e.g. async render)
will bump a major version and be listed in `CHANGELOG.md`.

---

### Next → [06-rendering-pipeline](06-rendering-pipeline.md)

