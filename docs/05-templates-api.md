# 05 – Templates API

Templates are **plain ECMAScript modules** that can live under a site‑specific
`/src/<domain>/templates/` directory or the shared `/templates/` directory. They
generate reusable page fragments—`<head>`, `<nav>`, `<footer>`—and RSS feed
items based on each page’s front‑matter and the site’s central `links.json`.
When a template is missing in these locations, Kobra Kreator checks for a file
with the **same name** under `/core/templates/`. If no matching core template
exists, the build fails with an error.

> **TL;DR**: export a `render()` function that returns an HTML string.

---

## 1. Folder structure

```text
/src/my-domain.com/templates/   # highest priority
  head/
    default.js
  nav/
    default.js
  footer/
    default.js
  feed/
    default.js

/templates/                     # shared across sites
  head/
    default.js
  nav/
    default.js
  footer/
    default.js
  feed/
    default.js
```

_The generator maps the `frontMatter.templates.X` key to `templates/X/<NAME>.js`
within the current site, then falls back to the project `/templates/` directory
and finally `/core/templates/`._

---

## 2. Module contract

```javascript
/**
 * Render a page fragment.
 *
 * @param {Object} params             – injected by the build system
 * @param {FrontMatter} params.frontMatter – parsed TOML object for the page
 * @param {LinksJson}  params.links        – contents of links.json for the site
 * @param {Config} params.config        - content of config.json for the site
 * @returns {string}                    – raw HTML that will be inserted verbatim
 */
export function render({ frontMatter, links, config }) {
  // build HTML string here – any template engine / tagged literal is fine
  return `\n<meta charset="utf-8">\n<title>${frontMatter.title}</title>\n`;
}
```

### Rules

1. **Synchronous return** – `render()` must return a _string_, _not_ a
   `Promise`. <!-- TODO: evaluate allowing async template rendering in v2. -->
2. **No side‑effects** – Templates should be _pure_ functions; they must **not**
   modify global state or perform network requests (keep builds deterministic).
3. **No outer wrappers** –

   - _Head_ templates: emit raw tags (e.g. `<meta>`, `<link>`, `<script>`),
     **not** the `<head>` itself.
   - _Nav_ / _Footer_ templates: include the `<nav>` or `<footer>` element in
     the output—you control its classes/ARIA attributes.
4. **Asset paths** – Use the same path rules described in
   [04-front‑matter](04-front-matter.md) (relative to site root or external
   URL).

---

## 3. Example implementations

### 3.1 Head / `default.js`

```javascript
export function render({ frontMatter }) {
  const cssLinks = (frontMatter.css || [])
    .map((href) => `<link rel="stylesheet" href="${href}">`)
    .join("\n");

  return `\n<meta charset="utf-8">\n<title>${frontMatter.title}</title>\n${cssLinks}`;
}
```

### 3.2 Nav / `default.js`

```javascript
export function render({ links }) {
  const items = links.nav
    .filter((l) => l.topLevel)
    .map((l) => `<li><a href="${l.href}">${l.label}</a></li>`) // TODO: handle subLevel buckets
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

  return `<footer>${
    Object.entries(columns)
      .map(([col, items]) =>
        `<div class="foot-col"><h3>${col}</h3>${
          items
            .map((i) => `<a href="${i.href}">${i.label}</a>`) // TODO: template for inner links
            .join("")
        }</div>`
      )
      .join("")
  }</footer>`;
}
```

### 3.4 Feed / `default.js`

```javascript
export function render({ item }) {
  const pubDate = item.date
    ? `<pubDate>${item.date.toUTCString()}</pubDate>`
    : "";
  return `<item>\n<title>${item.title}</title>\n<link>${item.link}</link>\n<description><![CDATA[${item.description}]]></description>\n${pubDate}\n</item>`;
}
```

---

## 4. Access to utilities (planned)

We may expose a small helper bundle (e.g. `escapeHtml`, `slugify`) via a third
parameter or named import.

<!-- TODO: design utilities object and document how to import/use it. -->

---

## 5. Error handling

- If a template **throws**, the build logs the error and halts—better fail fast
  than produce broken markup.
- Missing template file in the site directory → loads
  `/templates/<slot>/<name>.js`.
- Still missing → loads `/core/templates/<slot>/<name>.js`.
- Missing in all locations → build fails with an error.

---

## 6. Versioning & breaking changes

The API above is considered **v1**. Any breaking change (e.g. async render) will
bump a major version and be listed in `CHANGELOG.md`.

---

### Next → [06-rendering-pipeline](06-rendering-pipeline.md)
