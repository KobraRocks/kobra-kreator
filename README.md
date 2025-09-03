# Kobra Kreator 🐍

_A lightning‑fast, template‑driven static‑site generator built with **Deno**_

---

## Why Kobra Kreator?

| What you get                             | How it helps                                              |
| ---------------------------------------- | --------------------------------------------------------- |
| **Pure Deno** runtime & modules          | Zero Node.js tool‑chain, first‑class javascript support   |
| **Per‑domain folders** in `/src`         | Host multiple sites from one repo                         |
| **Hot‑reload watcher**                   | Edits propagate instantly to your output directory        |
| **Smart SVG tags** (`<icon>` / `<logo>`) | Drop SVGs straight into HTML and keep full CSS/JS control |
| **TOML front‑matter & JS templates**     | Mix static content with dynamic head/nav/footer rendering |
| **RSS feed generator**                   | Produce an automatic RSS feed for blog posts              |

---

## Quick Start ⏱️

```bash
# 1 – Install Deno (if you haven’t already)
curl -fsSL https://deno.land/install.sh | sh

# 2 – Clone this repository
 git clone https://github.com/KobraRocks/kobra‑kreator.git
 cd kobra‑kreator

# 3 – Run the generator in watch mode
 deno run -A --import-map=import_map.json main.js
#    Restrict to a single site folder (optional)
 deno run -A --import-map=import_map.json main.js --hostname example.com

# 4 – Open `dist/` (or the path you set in each site’s config.json) in your browser
```

> **Tip:** The first run performs a full build, then keeps watching `/src`
> (including any site templates) and `/templates` for changes.

Want to work with Codex? Follow this guideline to setup environment
[Codex Environement](https://github.com/KobraRocks/knowledge-base/blob/main/codex-with-deno.md)

## CLI Usage 🧰

Run the generator from the repository root with Deno:

```bash
deno run -A --import-map=import_map.json main.js
```

By default, Kobra Kreator spawns a worker for each available CPU core. You can
tweak the worker pool with `--workers` (or `-w`):

```bash
deno run -A --import-map=import_map.json main.js --workers 4
# or
deno run -A --import-map=import_map.json main.js -w 4
```

To focus on a single hostname under `src/`, pass the `--hostname` flag:

```bash
deno run -A --import-map=import_map.json main.js --hostname example.com
# or
deno run -A --import-map=import_map.json main.js -h example.com
```

The CLI performs a full build and then continues watching `src/` for changes.

---

## Folder Layout 🗂️

```
project-root/
├─ src/                # One sub‑folder per domain
│  └─ my-site.com/
│     ├─ templates/    # site‑specific head/nav/footer templates
│     ├─ media/ …      # images/, videos/, …
│     ├─ src-svg/ …    # raw SVG sources
│     ├─ js/ …         # client scripts
│     ├─ blog/ …       # sample blog posts
│     ├─ config.json   # build output path, etc.
│     └─ links.json    # nav & footer link registry
├─ templates/          # shared head/nav/footer templates
└─ docs/               # full specification (see below)
```

---

## Documentation 📚

The spec is split into bite‑sized Markdown files inside [`/docs`](docs/):

1. **01‑overview\.md** – Big‑picture architecture
2. **02‑directory‑layout.md** – Canonical tree & naming rules
3. **03‑special‑svg‑tags.md** – How `<icon>` / `<logo>` replacement works
4. **04‑front‑matter.md** – Full TOML reference
5. **05‑templates‑api.md** – Writing `render()` functions
6. **06‑rendering‑pipeline.md** – Step‑by‑step build flow
7. **07‑config‑schema.md** – Per‑site config file
8. **08‑links‑schema.md** – Navigation/footer link map
9. **09‑watch‑rules.md** – File‑system events & debounce logic
10. **10‑file‑copy‑rules.md** – Asset handling
11. **11‑dependencies.md** – External modules & Deno version

Head there for deep dives and examples.

## Tutorials 🎓

- [My First Project](tutorials/my-first-project.md) – a discovery‑style
  walkthrough that incrementally builds a site under `/src/my-project/`.

---

## Contributing 🤝

1. Fork ➜ create a feature branch ➜ open a PR.
2. Write tests where it makes sense.
3. Keep docs in sync with code changes.

> See [`CONTRIBUTING.md`](CONTRIBUTING.md) for coding style & commit guidelines.

---

## License 📝

Licensed under the MIT License. See [`LICENSE`](LICENSE).
