# 11 – Dependencies & Tooling

Kobra Kreator intentionally keeps its dependency surface **thin**—just the Deno
runtime plus a handful of third-party standard-library modules.  
This document lists all required versions and explains how we pin / upgrade
them.

---

## 1. Deno runtime

| Item | Value |
| ---- | ----- |
| **Recommended Version** | 2.4.0 |
| **Minimum version** | `1.46.0` <!-- TODO: bump when we rely on a newer API --> |
| **Why this floor?** | Introduced <https://deno.land/api?s=Deno.watchFs> debounce fix and Worker `name` option we use for logging. |
| **Tested on** | macOS 14, Windows 11, Ubuntu 22.04 |

> **Tip** – Developers can `deno task setup` (see `deno.json`) to auto-verify
> their local version.

---

## 2. Third-party modules (runtime)

| Import | SemVer / tag | Purpose |
| ------ | ------------ | ------- |
| `jsr:@std/toml` | `1.0.0` | Parse page front-matter. |
| `jsr:@b-fuze/deno-dom` | `0.1.36` | Server-side DOM for HTML manipulation. |

Both are **ESM** modules loaded from the official JSR registry, so they’re
fetched, cached, and locked by Deno automatically.

<!-- TODO: add checksum lockfile once JSR supports it. -->

---

## 3. Third-party modules (dev / CLI tasks)

| Tool | Version | Task |
| ---- | ------- | ---- |
| `deno fmt` | same as runtime | Code formatting |
| `deno lint` | ″ | Static analysis |
| `deno_task_shell` | latest | Cross-platform task runner (optional) |

Unit tests are written with Deno’s built-in `std/testing` library—no external
test runner needed.

---

## 4. Dynamic imports & cache policy

Templates are loaded via dynamic `import()`; Deno caches them by full specifier
path, so edits pick up **after a watcher invalidates that cache key**.

> No *eval* or unsafe code execution is used—imports are strictly file-system
> paths under `/templates/`.

---

## 5. Optional / planned dependencies

These libraries are **not yet included** but may appear as features land:

| Feature | Candidate module | Status |
| ------- | ---------------- | ------ |
| Image optimisation | `jsr:@imagor/deno-lib` | **TODO** – evaluate quality & license |
| Markdown → HTML | `jsr:@std/markdown` | **Planned** |
| Minify HTML/CSS/JS | `jsr:@minify/html` (hypothetical) | **Research** |

Any new dependency will be proposed via PR with **bundle size impact** notes.

---

## 6. Security & update cadence

* We pin exact versions in `import_map.json`.
* A weekly `deno check-updates` CI job opens PRs for patch / minor bumps.
* Any **security advisory** triggers an immediate patch release.

<!-- TODO: write Github workflow file once repo is public. -->

---

### Next steps
* Back to **README** for an end-to-end quick-start.
* Or jump ahead to **CHANGELOG.md** to see version history.

