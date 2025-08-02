Below is one sensible way to break the monolithic spec into small, purpose-built files.
Feel free to rename or reshuffle, but try to keep **one concept per file** so contributors can jump straight to what they need.

| File                              | Lives in     | Purpose / what goes inside                                                                                                                                                |
| --------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **README.md**                     | project root | Elevator-pitch & one-minute “how to run” snippet. Links to the rest of the docs.                                                                                          |
| **docs/01-overview\.md**          | docs/        | • What Kobra Kreator is<br>• Supported tech (HTML/CSS/JS on Deno)<br>• High-level build flow diagram (bullets or ASCII art)                                               |
| **docs/02-directory-layout.md**   | docs/        | • Canonical `/src/` tree (use the ASCII box you already have)<br>• Where templates live<br>• Rule: *“one folder per domain”*                                              |
| **docs/03-special-svg-tags.md**   | docs/        | • `<icon>` / `<logo>` spec<br>• When to prefer over `<img>`<br>• No extra attrs allowed<br>• Sub-directory lookup rule                                                    |
| **docs/04-front-matter.md**       | docs/        | • TOML separator `#---#`<br>• Full field catalogue (title, description, css, templates.*, scripts.*, links.\*)<br>• Examples + default behaviour for missing fields       |
| **docs/05-templates-api.md**      | docs/        | • File naming convention<br>• Required export:`ts\nexport function render({ frontMatter, links }): string {}\n`<br>• Where the return value is injected (head/nav/footer) |
| **docs/06-rendering-pipeline.md** | docs/        | Step-by-step 1-9 list (parse → update links.json → … → write to distant dir)                                                                                              |
| **docs/07-config-schema.md**      | docs/        | • Location `/src/<site>/config.json`<br>• Field table (currently only `distantDirectory`)<br>• Absolute-path rule & path-separator normalisation                          |
| **docs/08-links-schema.md**       | docs/        | • Location `/src/<site>/links.json`<br>• Canonical JSON with commas ☺<br>• Deduplication / sort policy                                                                    |
| **docs/09-watch-rules.md**        | docs/        | • `Deno.watchFs` basics<br>• Debounce/ignore algorithm<br>• Events → actions matrix                                                                                       |
| **docs/10-file-copy-rules.md**    | docs/        | • “preserve tree” wording<br>• Media extension whitelist<br>• Where CSS/JS land inside `distantDirectory`                                                                 |
| **docs/11-dependencies.md**       | docs/        | • External imports (`DOMParser`, `@std/toml`)<br>• Minimum Deno version<br>• Any lint/format rules                                                                        |
| **schemas/config.schema.json**    | schemas/     | JSON-Schema draft for config (helpful for editors/CI)                                                                                                                     |
| **schemas/links.schema.json**     | schemas/     | JSON-Schema draft for links.json                                                                                                                                          |
| **examples/sample-site/**         | examples/    | A tiny working domain folder showing everything in action (one page, one svg, etc.).                                                                                      |

### Tips for implementation

* Keep docs numbered (`01-…`, `02-…`) so they render in order on GitHub.
* Link forward/backward at the top of each doc for quick navigation.
* Whenever the spec evolves, touch only the relevant markdown file—no merge-conflict nightmare.

With this split, newcomers can skim **overview → their topic of interest** instead of scrolling through a single wall of text.

