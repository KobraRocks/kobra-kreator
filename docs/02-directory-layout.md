# 02 – Directory Layout

This document describes the **author‑side** folder structure that Kobra Kreator
expects, as well as the **build output** location controlled by each site’s
`config.json`.

> **Convention over configuration** – Stick to the tree below and the generator
> will “just work”.

---

## Canonical tree (author workspace)

```text
project-root/
├─ src/                                  # ← everything under here is watched
│  ├─ my-domain.com/                     # one folder per domain
│  │  ├─ index.html
│  │  ├─ index.css                       # page specific stylesheet (optional)
│  │  ├─ styles.css                      # extra global CSS (optional)
│  │  ├─ templates/                      # site-specific templates (optional)
│  │  ├─ js/                             # client‑side JS modules
│  │  │  └─ …
│  │  ├─ blog/                           # example content section
│  │  │  └─ post‑a.html
│  │  ├─ src-svg/                        # raw SVGs referenced by <icon>/<logo>
│  │  │  └─ …                            # sub‑directories allowed
│  │  ├─ media/
│  │  │  ├─ images/
│  │  │  ├─ videos/
│  │  │  ├─ audio/
│  │  │  └─ pdf/
│  │  ├─ links.json                      # nav & footer registry (auto‑managed)
│  │  └─ config.json                     # build target path, etc.
│  └─ another-domain.com/ …
│
├─ templates/                           # optional – falls back to /core/templates
│  ├─ head/
│  │  ├─ default.js
│  │  └─ blog.js
│  ├─ nav/
│  │  └─ default.js
│  └─ footer/
│     └─ default.js
│
└─ docs/                                 # spec & guides (not watched)
```

<!-- TODO: decide whether to reserve a folder such as `/shared/` for assets used by multiple sites -->

### Key rules

1. **Folder == domain.** The folder name must match the domain you will deploy
   under (e.g. `my‑domain.com`). Spaces and uppercase discouraged.
2. **Templates can be site-specific.** Each site may define its own `templates`
   folder which overrides files in the shared `/templates` directory and finally
   `/core/templates`.
3. **Styles can fall back to core.** If a stylesheet referenced by a page is
   missing under the site folder, a file with the same path from `/core/css/`
   is used instead.
4. **Sub‑folders allowed.** Inside any site, you can nest pages arbitrarily
   (e.g. `docs/getting-started.html`) – the relative path is preserved in the
   build output.
5. **`src-svg/` is special.** SVGs stored here are inlined by the generator when
   referenced via `<icon>` or `<logo>` tags.

---

## Build output ("distant directory")

Each site declares an **absolute** output path in its `config.json`:

```json
{
  "distantDirectory": "/absolute/path/for/my-domain.com"
}
```

The generator reproduces the same folder hierarchy **inside** that destination.
Example:

```text
/absolute/path/for/my-domain.com/
├─ index.html
├─ js/
│  └─ …
├─ blog/post‑a.html
├─ media/images/…
└─ styles.css
```

<!-- TODO: document optional hash‑based filenames or CDN sub‑paths once cache‑busting strategy is finalised -->

---

## File‑type cheat‑sheet

| Folder                 | Purpose                        | Watched events                               |
| ---------------------- | ------------------------------ | -------------------------------------------- |
| `*.html`               | Source pages with front‑matter | re‑render page                               |
| `*.css`, `*.js` (site) | Static assets to copy          | copy file                                    |
| `media/**`             | Images, video, docs, fonts     | copy file                                    |
| `src-svg/**.svg`       | Inlineable SVGs                | re‑render every page that references the SVG |
| `templates/**.js`      | Head / nav / footer generators | re‑render all pages that import the template |

---

## Extending the layout

Need a new asset category (e.g. `fonts/`, `downloads/`)?

- Place it **inside `media/`** so the default copy rules pick it up.
- If you require custom processing (minification, compression), plan to add a
  build‑step plugin.

  <!-- TODO: link to plugin system once designed -->

---

### Next stop → [03‑special‑svg‑tags](03-special-svg-tags.md)
