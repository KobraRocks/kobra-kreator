# 08 – `links.json` Schema

Navigation and footer menus are driven by a **per‑site** `links.json` file that
lives alongside each domain folder. Templates read this file to build `<nav>`
and `<footer>` elements at render‑time.

> **Path:** `/src/<site>/links.json`
>
> This file is **auto-generated** from page front-matter. Editing it manually is
> discouraged because changes are overwritten the next time any page is
> rendered.

---

## 1. High‑level structure

```jsonc
{
  "nav": [               // array – order is preserved
    { "topLevel": true, "href": "/",      "label": "Home" },
    { "subLevel": "docs", "href": "/docs/intro.html", "label": "Docs" }
  ],
  "footer": [           // array – grouped into columns by template logic
    { "column": "company", "href": "/about.html", "label": "About" },
    { "column": "legal",   "href": "/terms.html", "label": "Terms" }
  ]
}
```

* **`nav` array**

  * **Top‑level item** → object with `topLevel: true`.
  * **Sub‑level item** → object with `subLevel: "<bucket>"`.
* **`footer` array**

  * Items carry a `column: "<bucket>"` property.

> The build **does not** restrict buckets to a predefined list—templates decide
> how to group/sort them.

---

## 2. Field definitions

| Field      | Where        | Type    | Required | Notes                                                                 |
| ---------- | ------------ | ------- | -------- | --------------------------------------------------------------------- |
| `href`     | nav & footer | string  | **Yes**  | Absolute or root‑relative path.                                       |
| `label`    | nav & footer | string  | **Yes**  | Text visible in menu.                                                 |
| `topLevel` | nav          | boolean | ⬜        | Marks item as a first‑level link. Mutually exclusive with `subLevel`. |
| `subLevel` | nav          | string  | ⬜        | Bucket name for nested menu.                                          |
| `column`   | footer       | string  | ⬜        | Column bucket name.                                                   |

<!-- TODO: consider allowing `target:"_blank"`, `rel:"noopener"` for external links. -->

### Validity rules

1. Exactly **one** of `topLevel` or `subLevel` must be present for nav items.
2. Templates may assume `href` and `label` are always present.
3. Duplicate entries (same `href`) are removed during build merge.

   <!-- TODO: decide whether duplicates with different labels should keep the first or last label. -->

---

## 3. How links are **added & merged**

When a page has `[links]` keys in its front‑matter (see **04‑front‑matter**), the
renderer merges a new object into the array:

```toml
[links.nav]
topLevel = true
label = "Blog"
```

* If a nav item with the **same `href`** already exists, its `label` is updated.
* Merge happens **before** templates render so they always see the latest map.
* The file is rewritten to disk only when the in‑memory map changed, reducing
  noisy Git diffs.
* `links.json` is not watched for changes; update navigation through page
  front‑matter instead of editing the file directly.

<!-- TODO: expose a CLI `--rebuild-links` flag to regenerate links.json from scratch. -->

---

## 4. JSON‑Schema draft

Store this under `schemas/links.schema.json` for editor validation and unit
tests.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Kobra Kreator – links.json",
  "type": "object",
  "properties": {
    "nav": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["href", "label"],
        "oneOf": [
          { "required": ["topLevel"], "not": { "required": ["subLevel"] } },
          { "required": ["subLevel"], "not": { "required": ["topLevel"] } }
        ],
        "properties": {
          "href":   { "type": "string" },
          "label":  { "type": "string" },
          "topLevel": { "type": "boolean" },
          "subLevel": { "type": "string" }
        },
        "additionalProperties": false
      }
    },
    "footer": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["href", "label", "column"],
        "properties": {
          "href":   { "type": "string" },
          "label":  { "type": "string" },
          "column": { "type": "string" }
        },
        "additionalProperties": false
      }
    }
  },
  "additionalProperties": false
}
```

---

## 5. Versioning note

Any change that **breaks** JSON‑Schema compatibility will bump a major version
and be announced in `CHANGELOG.md`.

---

### Next → [09-watch-rules](09-watch-rules.md)

