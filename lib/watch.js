import { fromFileUrl } from "@std/path";
import {
  pagesUsingCss,
  pagesUsingModule,
  pagesUsingScript,
  pagesUsingSvg,
  pagesUsingTemplate,
  pagesWithLinks,
  recordPageDeps,
} from "./page-deps.js";
import { getEmoji } from "./emoji.js";
import { classifyPath, reduceEvents } from "./fs-utils.js";
import {
  diffSourceFiles,
  recordSourceFile,
  removeSourceFile,
} from "./source-file-tracker.js";
import { removePage, renderPage } from "./render-page.js";
import { copyAsset, removeAsset } from "./copy-asset.js";

/**
 * Render a page and update dependency records.
 *
 * Re-renders pages that reference `links.json` if navigation data changes.
 *
 * @param {string} path Absolute path to the page file.
 * @returns {Promise<void>} Resolves when rendering and dependency recording finish.
 */
async function renderAndRecord(path) {
  const deps = await renderPage(path);
  if (deps) {
    recordPageDeps(deps);
    if (deps.linksChanged) {
      for (const page of pagesWithLinks()) {
        if (page !== deps.pagePath) {
          await renderAndRecord(page);
        }
      }
    }
  }
}

/**
 * Queue a page for rendering when its source HTML changes.
 *
 * @param {string} path Path to the page file.
 * @param {Set<string>} tasks Set collecting pages to render.
 */
function handlePageHtml(path, tasks) {
  tasks.add(path);
}

/**
 * Handle updates to template files by re-rendering dependent pages.
 *
 * @param {string} path Path to the template.
 * @param {Set<string>} tasks Set collecting pages to render.
 */
function handleTemplateUpdate(path, tasks) {
  console.log(`${getEmoji("update")} TEMPLATE UPDATED -- ${path}`);
  for (const page of pagesUsingTemplate(path)) {
    tasks.add(page);
  }
}

/**
 * Handle updates to inline scripts by refreshing referencing pages.
 *
 * @param {string} path Path to the inline script.
 * @param {Set<string>} tasks Set collecting pages to render.
 */
function handleInlineScriptUpdate(path, tasks) {
  console.log(`${getEmoji("update")} INLINE SCRIPT UPDATED -- ${path}`);
  const pages = pagesUsingScript(path);
  if (pages.length === 0) {
    console.log(
      `  ${getEmoji("warning")} no pages reference this inline script`,
    );
    return;
  }
  for (const page of pages) tasks.add(page);
  console.log(`  ${getEmoji("update")} ${pages.length} page(s) updated`);
}

/**
 * Handle updates to inline SVGs by re-rendering dependent pages.
 *
 * @param {string} path Path to the SVG file.
 * @param {Set<string>} tasks Set collecting pages to render.
 */
function handleInlineSvgUpdate(path, tasks) {
  console.log(`${getEmoji("update")} SVG UPDATED -- ${path}`);
  const pages = pagesUsingSvg(path);
  if (pages.length === 0) {
    console.log(`  ${getEmoji("warning")} no pages reference this SVG`);
    return;
  }
  for (const page of pages) tasks.add(page);
  console.log(`  ${getEmoji("update")} ${pages.length} page(s) updated`);
}

/**
 * Handle updates to CSS assets by re-rendering dependent pages.
 *
 * @param {string} path Path to the CSS file.
 * @param {Set<string>} tasks Set collecting pages to render.
 */
function handleCssAsset(path, tasks) {
  console.log(`${getEmoji("update")} CSS UPDATED -- ${path}`);
  const pages = pagesUsingCss(path);
  if (pages.length === 0) {
    console.log(`  ${getEmoji("warning")} no pages reference this stylesheet`);
    return;
  }
  for (const page of pages) tasks.add(page);
  console.log(`  ${getEmoji("update")} ${pages.length} page(s) updated`);
}

/**
 * Handle updates to module script assets by re-rendering dependent pages.
 *
 * @param {string} path Path to the module script.
 * @param {Set<string>} tasks Set collecting pages to render.
 */
function handleModuleAsset(path, tasks) {
  console.log(`${getEmoji("update")} MODULE UPDATED -- ${path}`);
  const pages = pagesUsingModule(path);
  if (pages.length === 0) {
    console.log(`  ${getEmoji("warning")} no pages reference this module`);
    return;
  }
  for (const page of pages) tasks.add(page);
  console.log(`  ${getEmoji("update")} ${pages.length} page(s) updated`);
}

/**
 * Copy an asset and schedule any dependent pages for re-rendering.
 *
 * @param {string} path Path to the asset.
 * @param {Set<string>} tasks Set collecting pages to render.
 */
async function handleAssetUpdate(path, tasks) {
  await copyAsset(path);
  const ext = path.slice(path.lastIndexOf(".")).toLowerCase();
  if (ext === ".css") {
    handleCssAsset(path, tasks);
  } else if (ext === ".js" && !path.endsWith(".inline.js")) {
    handleModuleAsset(path, tasks);
  }
}

/**
 * Remove the rendered output for a page whose source was deleted.
 *
 * @param {string} path Path to the page file.
 */
async function handlePageRemove(path) {
  await removePage(path);
}

/**
 * Remove a copied asset when it is deleted from the source.
 *
 * @param {string} path Path to the asset file.
 */
async function handleAssetRemove(path) {
  await removeAsset(path);
}

/**
 * Handle removal of a template by re-rendering dependent pages.
 *
 * @param {string} path Path to the template file.
 * @param {Set<string>} tasks Set collecting pages to render.
 */
function handleTemplateRemove(path, tasks) {
  console.log(`${getEmoji("delete")} TEMPLATE REMOVED -- ${path}`);
  for (const page of pagesUsingTemplate(path)) {
    tasks.add(page);
  }
}

/** @type {Record<string, (p: string, t: Set<string>) => void|Promise<void>>} */
const createModifyHandlers = {
  PAGE_HTML: handlePageHtml,
  TEMPLATE: handleTemplateUpdate,
  JS_INLINE: handleInlineScriptUpdate,
  SVG_INLINE: handleInlineSvgUpdate,
  ASSET: handleAssetUpdate,
};

/** @type {Record<string, (p: string, t: Set<string>) => void|Promise<void>>} */
const removeHandlers = {
  PAGE_HTML: (p, _t) => handlePageRemove(p),
  ASSET: (p, _t) => handleAssetRemove(p),
  TEMPLATE: handleTemplateRemove,
};

/**
 * Watch the source and shared directories for changes and trigger rebuilds.
 * Optionally limits watching to a specific hostname under `src/`.
 *
 * @param {string} [hostname=""] Hostname folder to watch (e.g. "example.com").
 * @returns {Promise<void>} Resolves when the watcher stops.
 */
export async function watch(hostname = "") {
  const srcRoot = new URL("../src", import.meta.url);
  const src = fromFileUrl(hostname ? new URL(`./${hostname}`, srcRoot) : srcRoot);
  const shared = fromFileUrl(new URL("../shared", import.meta.url));

  try {
    await Deno.mkdir(src);
  } catch (_err) {
    console.log(`${getEmoji("warning")} CREATE DIR /src/ -- no need it exists`);
  }

  try {
    await Deno.mkdir(shared);
  } catch (_err) {
    console.log(
      `${getEmoji("warning")} CREATE DIR /shared/ -- no need it exists`,
    );
  }

  const srcWatcher = Deno.watchFs(src, { recursive: true });
  if (hostname) {
    console.log(`${getEmoji("success")} CREATING WATCHER /src/${hostname}/`);
  } else {
    console.log(`${getEmoji("success")} CREATING WATCHER /src/`);
  }

  const sharedWatcher = Deno.watchFs(shared, { recursive: true });
  console.log(`${getEmoji("success")} CREATED WATCHER /shared/`);

  const watchers = [srcWatcher, sharedWatcher];

  const diffs = [
    await diffSourceFiles(src),
    await diffSourceFiles(shared),
  ];
  const startupTasks = new Set();
  for (const { added, modified, removed } of diffs) {
    for (const [p, m] of [...added, ...modified]) {
      const kind = classifyPath(p);
      const handler = createModifyHandlers[kind];
      if (handler) await handler(p, startupTasks);
      recordSourceFile(p, m);
    }
    for (const p of removed) {
      const kind = classifyPath(p);
      const handler = removeHandlers[kind];
      if (handler) await handler(p, startupTasks);
      removeSourceFile(p);
    }
  }
  for (const p of startupTasks) await renderAndRecord(p);

  const queue = [];
  let timer;

  /**
   * Process queued filesystem events and dispatch rendering tasks.
   *
   * @returns {Promise<void>} Resolves when processing completes.
   */
  async function flush() {
    const events = queue.splice(0);
    timer = undefined;
    const paths = reduceEvents(events);
    const tasks = new Set();
    for (const [path, evtKind] of paths) {
      const kind = classifyPath(path);
      if (evtKind === "create" || evtKind === "modify") {
        const handler = createModifyHandlers[kind];
        if (handler) await handler(path, tasks);
        let mtime = 0;
        try {
          const stat = await Deno.stat(path);
          if (stat.mtime) mtime = stat.mtime.getTime();
        } catch (err) {
          if (!(err instanceof Deno.errors.NotFound)) throw err;
        }
        recordSourceFile(path, mtime);
      } else if (evtKind === "remove") {
        const handler = removeHandlers[kind];
        if (handler) await handler(path, tasks);
        removeSourceFile(path);
      }
    }
    for (const p of tasks) await renderAndRecord(p);
  }

  /**
   * Consume events from a file system watcher and queue them for processing.
   *
   * @param {Deno.FsWatcher} w Watcher to read events from.
   * @returns {Promise<void>} Resolves when the watcher ends.
   */
  async function handle(w) {
    for await (const evt of w) {
      queue.push(evt);
      if (!timer) timer = setTimeout(flush, 50);
    }
  }

  await Promise.all(watchers.map(handle));
}
