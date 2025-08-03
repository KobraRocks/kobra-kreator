# 09 – Watch Rules (`Deno.watchFs`)

Kobra Kreator ships with a **live-rebuild watcher** so you can keep editing in
`/src/` and `/templates/` and see changes immediately in your
`distantDirectory`.

This document specifies _what_ we watch, _how_ we coalesce noisy events from
various editors/OSes, and _which_ build or copy action runs for each change.

---

## 1. Watch roots

| Path          | Why                                  |
| ------------- | ------------------------------------ |
| `/src/`       | All site content & assets live here. |
| `/templates/` | Global head/nav/footer modules.      |

> **Implementation note** – We create **one** `watchFs` subscription for each
> root so glob patterns remain simple.

---

## 2. Raw FS events vs. logical events

`Deno.watchFs()` streams low-level events that vary by platform. A single file
save can emit several events (e.g. `"access" → "modify" → "modify"`).

We reduce _raw events_ to _logical events_ with two rules:

1. **Collapse duplicates** – If two identical events on the same path occur
   back-to-back within the debounce window, keep only the first.
2. **Promote sequences** – `create → modify` on the same path counts as one
   **create**.

<!-- TODO: document how rename events are handled on Windows (usually "rename" + "modify"). -->

---

## 3. Debounce

- **Interval:** `50 ms` default <!-- TODO: benchmark & tune -->
- On the first event, start a timer; buffer all incoming events until it fires;
  then process the **unique** set.
- Keeps the CLI responsive without thrashing the CPU.

---

## 4. File-type routing

| Extension(s)                                                                            | Destination action             |
| --------------------------------------------------------------------------------------- | ------------------------------ |
| `.html`, `.md`                                                                          | `renderPage(path)`             |
| `.js` **under `/templates/`**                                                           | `renderAllUsingTemplate(path)` |
| `.svg` **under `src-svg/`**                                                             | `renderAllUsingSvg(path)`      |
| `.inline.js`                                                                            | `renderAllUsingScript(path)`   |
| `.css`, `.js` **under a site folder**                                                   | `copyAsset(path)`              |
| Media files in `media/`<br>`(.svg\*, .mp4, .jpg, .png, .webm, .webp, .pdf, .ttf, .otf)` | `copyAsset(path)`              |

\* SVG files **outside** `src-svg/` are treated as binary assets, **not**
inlined.

Inline script files (`.inline.js`) trigger `renderAllUsingScript` to re-render
any pages that include them.

<!-- TODO: confirm whether `.ico` should trigger copy or be ignored. Current spec lists it in watch list. -->

When a page or asset is **removed**, its counterpart in `distantDirectory` is
deleted to keep the output tree in sync.

---

## 5. Rendering triggers in pseudocode

```ts
for (const batch of debounce(watchFs(["/src", "/templates"]))) {
  const tasks = new Set();

  for (const evt of batch) {
    const kind = classify(evt.path);
    if (evt.kind === "remove") {
      if (kind === "PAGE_HTML") tasks.add(() => removePage(evt.path));
      if (kind === "ASSET") tasks.add(() => removeAsset(evt.path));
    } else {
      if (kind === "PAGE_HTML") tasks.add(() => renderPage(evt.path));
      if (kind === "TEMPLATE") {
        tasks.add(() => renderAllUsingTemplate(evt.path));
      }
      if (kind === "SVG_INLINE") tasks.add(() => renderAllUsingSvg(evt.path));
      if (kind === "JS_INLINE") tasks.add(() => renderAllUsingScript(evt.path));
      if (kind === "ASSET") tasks.add(() => copyAsset(evt.path));
    }
  }

  // Run tasks in parallel worker pool
  await Promise.all([...tasks].map(runTask));
}
```

<!-- TODO: lift this snippet into `/examples/watch-snippet.ts` for integration tests. -->

---

## 6. Failure & restart strategy

| Scenario                          | Behaviour                                                                      |
| --------------------------------- | ------------------------------------------------------------------------------ |
| Build-time error (bad TOML, etc.) | Logs error, skips task; watcher stays alive—fix & save to retry.               |
| Uncaught exception in main loop   | Automatic watcher restart after 2 s back-off. <!-- TODO: implement wrapper --> |

---

## 7. CLI flags (future)

| Flag                   | Default | Purpose                                       |
| ---------------------- | ------- | --------------------------------------------- |
| `--debounce=<ms>`      | `50`    | Adjust debounce window.                       |
| `--ignore=glob[,glob]` | _none_  | Exclude additional paths (e.g. editor temps). |
| `--poll`               | `false` | Fallback polling on FSes lacking native watch |

---

### Next → [10-file-copy-rules](10-file-copy-rules.md)
