# 00 – Roadmap

This document tracks major features of **Kobra Kreator** and their
implementation status.

| Feature                              | Status | Comment                                |
| ------------------------------------ | ------ | -------------------------------------- |
| Multi‑site build from one repo       | ✅     | Folders in `/src/` for each domain     |
| Pure Deno runtime                    | ✅     | No Node.js tool‑chain needed           |
| Template modules for head/nav/footer | ✅     | Reusable JS `render()` functions       |
| Hot‑reload file watcher              | ✅     | Uses `Deno.watchFs` with debounce      |
| SVG tags `<icon>` / `<logo>`         | ✅     | Tags replaced with inline SVG          |
| Arbitrary page scripts               | ✅     | `scripts.modules` & `scripts.inline`   |
| Front‑matter (TOML)                  | ✅     | Controls templates, assets, navigation |
| Links.json navigation/footer         | ✅     | Auto‑merged from front‑matter          |
| Dependency map for smart rebuilds    | ✅     | Tracks templates, SVGs & scripts       |
| Worker thread rendering              | ✅     | `--workers` to override default        |
| Markdown pages                       | ✅     | Write pages in Markdown (`.md`)        |
| Plugin system                        | 🚧     | Allow custom build steps               |
| Markdown → HTML converter            | ✅     | Built-in parser                        |
| i18n routing                         | 🚧     | Compile language variants              |
| `--minify` CLI flag                  | 🚧     | Collapse whitespace                    |
| `--verbose` CLI flag                 | 🚧     | Extra timing info                      |
| Config `baseUrl`                     | 🚧     | Inject canonical URLs                  |
| Config `prettyUrls`                  | ✅     | Omit `.html` in links                  |
| Config `hashAssets`                  | 🚧     | Content‑hashed asset filenames         |
| Config `cleanOutput`                 | 🚧     | Remove stale files                     |
| CLI `--outDir` override              | 🚧     | Temporarily change `distantDirectory`  |
| Links CLI `--rebuild-links`          | 🚧     | Regenerate `links.json`                |
| Watcher CLI `--debounce`             | 🚧     | Adjust debounce window                 |
| Watcher CLI `--ignore`               | 🚧     | Exclude paths                          |
| Watcher CLI `--poll`                 | 🚧     | Polling fallback                       |
| Hash‑based filenames                 | 🚧     | For cache busting                      |
| Clean up deleted assets              | ✅     | Source removals delete outputs         |
| Image optimisation                   | 🔍     | Investigate plugin                     |
| Symlink instead of copy              | 🤔     | Evaluate for dev convenience           |
| Template utility bundle              | 🚧     | Helpers like `escapeHtml`              |
