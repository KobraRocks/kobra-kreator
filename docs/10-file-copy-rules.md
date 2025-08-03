# 10 – File-Copy Rules

When a watched asset (CSS, JS, media) changes, Kobra Kreator **copies** it to
the site’s `distantDirectory` instead of re-rendering the whole page.\
This document spells out how paths are resolved, which extensions are handled,
and what future enhancements are on the table.

---

## 1. Core principle – “preserve the tree”

```
/src/my-site.com/js/app.js      ──►  <distantDirectory>/js/app.js
/src/my-site.com/media/images/logo.png
──►  <distantDirectory>/media/images/logo.png
```

- **Relative path inside the site folder is kept verbatim.**\
  No minification, bundling, or renaming occurs in v1.
- **Parent folders are created** in the output directory if missing.

> If two sites contain `js/app.js`, they won’t clash—each has its own
> `distantDirectory`.

---

## 2. Extension whitelist

| Category    | Extensions (case-insensitive)                                    |
| ----------- | ---------------------------------------------------------------- |
| Stylesheets | `.css`                                                           |
| JavaScript  | `.js` <!-- TODO: add `.mjs`, `.cjs` if/when we support them. --> |
| Images      | `.svg` (outside `src-svg/`), `.jpg`, `.png`, `.webp`, `.ico`     |
| Video       | `.mp4`, `.webm`                                                  |
| Documents   | `.pdf`                                                           |
| Fonts       | `.ttf`, `.otf`                                                   |

Anything **not** in this list is ignored by the copy routine; feel free to
extend via a future config key.

Inline JavaScript (`.inline.js`) files are intentionally excluded—they are
inlined into HTML pages instead of being copied.

---

## 3. Copy triggers

| Event source                                   | Action                                               |
| ---------------------------------------------- | ---------------------------------------------------- |
| **Modify** or **create** on a whitelisted file | Copy file to destination (overwrites if exists).     |
| **Remove** on a whitelisted file               | Delete file from destination to keep output in sync. |

---

## 4. Large-file safety

Assets are copied via `Deno.copyFile()` which streams the file kernel-side—no
RAM blow-ups for big videos.

- Copy operations run in **worker pool** threads so page rendering isn’t
  blocked.
- Failures (e.g. permissions) log an error and keep the watcher alive.

---

## 5. Hash-based filenames

If `hashAssets` is enabled (see [07-config-schema](07-config-schema.md)), CSS and JS files are copied as `name.<hash>.ext`. The original un-hashed file and any outdated hashed copies in the output directory are removed. Because pages reference these hashed filenames, any page that links to a changed asset must be rebuilt to update the hash.

---

## 6. Future roadmap

| Feature                                    | Status      | Notes                                                                     |
| ------------------------------------------ | ----------- | ------------------------------------------------------------------------- |
| **Hash-based filenames** for cache busting | Done        | Enabled via `hashAssets` in _07-config-schema_; see section 5.|
| **Clean up deleted assets**                | Done        | Source removals delete corresponding output files.                        |
| **Image optimisation (lossless)**          | Investigate | Could be opt-in plugin.                                                   |
| **Symlink instead of copy** on same volume | Evaluate    | Saves disk during dev; risky for deployment. <!-- TODO: decide policy --> |

---

### Next → [11-dependencies](11-dependencies.md)
