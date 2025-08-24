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
import { WorkerPool } from "./worker-pool.js";
import {
  diffSourceFiles,
  recordSourceFile,
  removeSourceFile,
} from "./source-file-tracker.js";

/**
 * @type {WorkerPool}
 */
let workerPool;

/**
 * Create a worker task that renders a page through the pipeline and records its
 * dependencies.
 *
 * @param {string} path - Path to the page to render.
 * @returns {[import("./worker-pool.js").WorkerTask, Array<(e: MessageEvent) => void>]} Task and callbacks tuple.
*/
function workerProcessPage(path) {
  return [
    { type: "render", path },
    [
      (e) => {
        const deps = e.data.deps;
        recordPageDeps(deps);
        // If navigation data changed, refresh other pages that reference links.json.
        if (deps && deps.linksChanged) {
          for (const page of pagesWithLinks()) {
            if (page !== deps.pagePath) {
              workerPool.push(...workerProcessPage(page));
            }
          }
        }
      },
    ],
  ];
}

/**
 * Schedule rendering of a page when its HTML changes.
 *
 * @param {string} path - Path to the page file.
 * @param {Map<string, ReturnType<typeof workerProcessPage>>} tasks - Map of queued tasks.
 */
function handlePageHtml(path, tasks) {
  tasks.set(path, workerProcessPage(path));
}

/**
 * Handle updates to a template file by re-rendering dependent pages.
 *
 * @param {string} path - Path to the template.
 * @param {Map<string, ReturnType<typeof workerProcessPage>>} tasks - Map of queued tasks.
 */
function handleTemplateUpdate(path, tasks) {
  console.log(`${getEmoji("update")} TEMPLATE UPDATED -- ${path}`);
  for (const page of pagesUsingTemplate(path)) {
    tasks.set(page, workerProcessPage(page));
  }
}

/**
 * Handle updates to an inline script by refreshing referencing pages.
 *
 * @param {string} path - Path to the inline script.
 * @param {Map<string, ReturnType<typeof workerProcessPage>>} tasks - Map of queued tasks.
 */
function handleInlineScriptUpdate(path, tasks) {
  console.log(`${getEmoji("update")} INLINE SCRIPT UPDATED -- ${path}`);
  const pages = pagesUsingScript(path);
  if (pages.length === 0) {
    console.log(`  ${getEmoji("warning")} no pages reference this inline script`);
    return;
  }
  for (const page of pages) {
    tasks.set(page, workerProcessPage(page));
  }
  console.log(`  ${getEmoji("update")} ${pages.length} page(s) updated`);
}

/**
 * Handle updates to an inline SVG by re-rendering dependent pages.
 *
 * @param {string} path - Path to the SVG file.
 * @param {Map<string, ReturnType<typeof workerProcessPage>>} tasks - Map of queued tasks.
 */
function handleInlineSvgUpdate(path, tasks) {
  console.log(`${getEmoji("update")} SVG UPDATED -- ${path}`);
  const pages = pagesUsingSvg(path);
  if (pages.length === 0) {
    console.log(`  ${getEmoji("warning")} no pages reference this SVG`);
    return;
  }
  for (const page of pages) {
    tasks.set(page, workerProcessPage(page));
  }
  console.log(`  ${getEmoji("update")} ${pages.length} page(s) updated`);
}

/**
 * Handle a CSS asset change by updating pages that reference it.
 *
 * @param {string} path - Path to the CSS asset.
 * @param {Map<string, ReturnType<typeof workerProcessPage>>} tasks - Map of queued tasks.
 */
function handleCssAsset(path, tasks) {
  console.log(`${getEmoji("update")} CSS UPDATED -- ${path}`);
  const pages = pagesUsingCss(path);
  if (pages.length === 0) {
    console.log(`  ${getEmoji("warning")} no pages reference this stylesheet`);
    return;
  }
  for (const page of pages) {
    tasks.set(page, workerProcessPage(page));
  }
  console.log(`  ${getEmoji("update")} ${pages.length} page(s) updated`);
}

/**
 * Handle a JavaScript module change by updating referencing pages.
 *
 * @param {string} path - Path to the module file.
 * @param {Map<string, ReturnType<typeof workerProcessPage>>} tasks - Map of queued tasks.
 */
function handleModuleAsset(path, tasks) {
  console.log(`${getEmoji("update")} MODULE UPDATED -- ${path}`);
  const pages = pagesUsingModule(path);
  if (pages.length === 0) {
    console.log(`  ${getEmoji("warning")} no pages reference this module`);
    return;
  }
  for (const page of pages) {
    tasks.set(page, workerProcessPage(page));
  }
  console.log(`  ${getEmoji("update")} ${pages.length} page(s) updated`);
}

/**
 * Handle updates to generic assets and delegate to specific handlers.
 *
 * @param {string} path - Path to the asset.
 * @param {Map<string, ReturnType<typeof workerProcessPage>>} tasks - Map of queued tasks.
 */
function handleAssetUpdate(path, tasks) {
  workerPool.push({ type: "asset", path });
  const ext = path.slice(path.lastIndexOf(".")).toLowerCase();
  if (ext === ".css") {
    handleCssAsset(path, tasks);
  } else if (ext === ".js" && !path.endsWith(".inline.js")) {
    handleModuleAsset(path, tasks);
  }
}

/**
 * Remove a page output when its source HTML is deleted.
 *
 * @param {string} path - Path to the page file.
 */
function handlePageRemove(path) {
  workerPool.push({ type: "remove-page", path });
}

/**
 * Remove an asset output when deleted.
 *
 * @param {string} path - Path to the asset file.
 */
function handleAssetRemove(path) {
  workerPool.push({ type: "remove-asset", path });
}

/**
 * Handle removal of a template by re-rendering dependent pages.
 *
 * @param {string} path - Path to the removed template.
 * @param {Map<string, ReturnType<typeof workerProcessPage>>} tasks - Map of queued tasks.
 */
function handleTemplateRemove(path, tasks) {
  console.log(`${getEmoji("delete")} TEMPLATE REMOVED -- ${path}`);
  for (const page of pagesUsingTemplate(path)) {
    tasks.set(page, workerProcessPage(page));
  }
}

/** @type {Record<string, (p: string, t: Map<string, ReturnType<typeof workerProcessPage>>) => void>} */
const createModifyHandlers = {
  PAGE_HTML: handlePageHtml,
  TEMPLATE: handleTemplateUpdate,
  JS_INLINE: handleInlineScriptUpdate,
  SVG_INLINE: handleInlineSvgUpdate,
  ASSET: handleAssetUpdate,
};

/** @type {Record<string, (p: string, t: Map<string, ReturnType<typeof workerProcessPage>>) => void>} */
const removeHandlers = {
  PAGE_HTML: (p) => handlePageRemove(p),
  ASSET: (p) => handleAssetRemove(p),
  TEMPLATE: handleTemplateRemove,
};

/**
 * Watch the source and template directories for changes and trigger rebuilds.
 *
 * @param {number} [workers] Number of worker threads to use.
 * @returns {Promise<void>}
 */
export async function watch(workers = navigator.hardwareConcurrency ?? 2) {
  workerPool = new WorkerPool(
    new URL("./worker-task.js", import.meta.url).href,
    workers,
  );
  const src = fromFileUrl(new URL("../src", import.meta.url));
  const templates = fromFileUrl(new URL("../templates", import.meta.url));

  try {
    await Deno.mkdir(src);
  } catch (exitErr) {
    console.log(`${getEmoji("warning")} CREATE DIR /src/ -- no need it exists`);
  }

  try {
    await Deno.mkdir(templates);
  } catch (exitErr) {
    console.log(
      `${getEmoji("warning")} CREATE DIR /template/ -- no need it exists`,
    );
  }

  const srcWatcher = Deno.watchFs(src, { recursive: true });
  console.log(`${getEmoji("success")} CREATING WATCHER /src/`);

  const templatesWatcher = Deno.watchFs(templates, { recursive: true });
  console.log(`${getEmoji("success")} CREATED WATCHER /templates/`);

  const watchers = [srcWatcher, templatesWatcher];

  // Initial synchronization of existing files before processing new events
  const diffs = [
    await diffSourceFiles(src),
    await diffSourceFiles(templates),
  ];
  const startupTasks = new Map();
  for (const { added, modified, removed } of diffs) {
    for (const [p, m] of [...added, ...modified]) {
      const kind = classifyPath(p);
      const handler = createModifyHandlers[kind];
      if (handler) handler(p, startupTasks);
      recordSourceFile(p, m);
    }
    for (const p of removed) {
      const kind = classifyPath(p);
      const handler = removeHandlers[kind];
      if (handler) handler(p, startupTasks);
      removeSourceFile(p);
    }
  }
  await Promise.all(
    [...startupTasks.values()].map((t) => workerPool.push(...t)),
  );

  const queue = [];
  let timer;

  /**
   * Process queued filesystem events and dispatch worker tasks.
   *
   * @returns {Promise<void>}
   */
  async function flush() {
    const events = queue.splice(0);
    timer = undefined;
    const paths = reduceEvents(events);
    const tasks = new Map();
    for (const [path, evtKind] of paths) {
      const kind = classifyPath(path);
      if (evtKind === "create" || evtKind === "modify") {
        const handler = createModifyHandlers[kind];
        if (handler) handler(path, tasks);
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
        if (handler) handler(path, tasks);
        removeSourceFile(path);
      }
    }
    await Promise.all(
      [...tasks.values()].map((t) => workerPool.push(...t)),
    );
  }

  /**
   * Consume events from a file system watcher and queue them for processing.
   *
   * @param {Deno.FsWatcher} w - Watcher to read events from.
   * @returns {Promise<void>}
   */
  async function handle(w) {
    for await (const evt of w) {
      queue.push(evt);
      if (!timer) timer = setTimeout(flush, 50);
    }
  }

  await Promise.all(watchers.map(handle));
}
