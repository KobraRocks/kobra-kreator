# 07 – `config.json` Schema

Every site folder under `/src/` **must** include a `config.json` file. The build
process reads this file once at start‑up to determine where to write the
compiled site and (soon) several optional behaviours.

> **Path:** `/src/<site>/config.json`

---

## 1. Current fields (v1)

| Key                | Type    | Required | Description                                                                                                                                                                        |
| ------------------ | ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `distantDirectory` | string  | **Yes**  | **Absolute** path where the rendered site will be written. Use forward slashes on macOS/Linux; Windows paths may use either `C:\\path` or `C:/path` and are normalised internally. |
| `prettyUrls`       | boolean | No       | If `true`, generator omits `.html` extensions in links and writes `index.html` files in matching folders.                                                                          |
| `hashAssets`       | boolean | No       | When enabled, CSS and JS filenames receive a short content hash (e.g. `app.4f3d.css`) for cache busting.                                                                           |

> If the path does **not** exist, Kobra Kreator creates it recursively. If it
> **does** exist but is **not empty**, existing files are overwritten when
> pages/assets share the same relative path.

---

## 2. Planned / proposed fields (v2+)

These keys are **not yet implemented** but are listed here so integrators can
begin planning. They will be added through minor/major version bumps.

| Key           | Type    | Default | Purpose                                                                                                                       |
| ------------- | ------- | ------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `baseUrl`     | string  | `"/"`   | Public URL prefix injected into templates for canonical links, OG tags, etc. <!-- TODO: confirm need & exact semantics. -->   |
| `cleanOutput` | boolean | `false` | Remove files in `distantDirectory` that no longer exist in source. Useful for CI. <!-- TODO: evaluate performance impact. --> |

Feel free to open a GitHub discussion if you need additional knobs.

---

## 3. Example `config.json`

```jsonc
{
  // v1 – minimal
  "distantDirectory": "/var/www/my-domain.com",

  // v1 – optional extras
  "prettyUrls": true,
  "hashAssets": true,

  // v2 – planned extras (currently ignored)
  "baseUrl": "https://my-domain.com/",
  "cleanOutput": true
}
```

<!-- TODO: when new keys are stabilised, move them to the "Current fields" table above and bump version notes. -->

---

## 4. JSON‑Schema draft (for editor validation)

Below is a _draft_ Draft‑07 JSON‑Schema. Save it as `schemas/config.schema.json`
so editors like VS Code can auto‑validate.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Kobra Kreator – site config",
  "type": "object",
  "required": ["distantDirectory"],
  "additionalProperties": false, // set to true once optional fields are live
  "properties": {
    "distantDirectory": {
      "type": "string",
      "description": "Absolute output path",
      "pattern": "^(?:[a-zA-Z]:\\\\|/)" /* simplistic absolute-path regex */
    },
    "prettyUrls": {
      "type": "boolean",
      "description": "Omit .html extensions in links and emit index.html"
    },
    "hashAssets": {
      "type": "boolean",
      "description": "Add content hash to CSS and JS filenames"
    }
    /* TODO: add baseUrl, cleanOutput once supported */
  }
}
```

> **Note**: The regex above merely checks that the path starts with either a
> drive letter & colon or a forward slash. It does **not** validate that the
> path exists—build code will handle that.

---

## 5. CLI overrides (future)

We plan to add CLI flags such as `--outDir` to temporarily override
`distantDirectory` for CI pipelines without editing the JSON file.

<!-- TODO: document flag precedence rules once implemented. -->

---

### Next → [08-links-schema](08-links-schema.md)
