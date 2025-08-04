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
import {
  MEDIA_EXTENSIONS,
  SRC_ASSET_EXTENSIONS,
} from "./extension-whitelist.js";
import { getEmoji } from "./emoji.js";
import { classifyPath, reduceEvents } from "./fs-utils.js";
import { WorkerPool } from "./worker-pool.js";

/**
 * @type {WorkerPool}
 */
let workerPool;

/**
 * Queue a page render task with the worker pool.
 *
 * @param {string} path - Path to the page to render.
 * @returns {void}
 */
function workerRenderPage(path) {
  workerPool.push({ type: "render", path }, [
    (e) => {
      const deps = e.data.deps;
      recordPageDeps(deps);
      // If navigation data changed, refresh other pages that reference links.json.
      if (deps && deps.linksChanged) {
        for (const page of pagesWithLinks()) {
          if (page !== deps.pagePath) workerRenderPage(page);
        }
      }
    },
  ]);
}

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
        if (kind === "PAGE_HTML") {
          workerRenderPage(path);
        } else if (kind === "TEMPLATE") {
          console.log(`${getEmoji("update")} TEMPLATE UPDATED -- ${path}`);
          for (const page of pagesUsingTemplate(path)) {
            workerRenderPage(page);
          }
        } else if (kind === "JS_INLINE") {
          console.log(`${getEmoji("update")} INLINE SCRIPT UPDATED -- ${path}`);
          const pages = pagesUsingScript(path);
          if (pages.length === 0) {
            console.log(
              `  ${getEmoji("warning")} no pages reference this inline script`,
            );
          } else {
            for (const page of pages) {
              workerRenderPage(page);
            }
            console.log(
              `  ${getEmoji("update")} ${pages.length} page(s) updated`,
            );
          }
        } else if (kind === "SVG_INLINE") {
          console.log(`${getEmoji("update")} SVG UPDATED -- ${path}`);
          const pages = pagesUsingSvg(path);
          if (pages.length === 0) {
            console.log(`  ${getEmoji("warning")} no pages reference this SVG`);
          } else {
            for (const page of pages) {
              workerRenderPage(page);
            }
            console.log(
              `  ${getEmoji("update")} ${pages.length} page(s) updated`,
            );
          }
        } else if (kind === "ASSET") {
          workerPool.push(`asset:${path}`, { type: "asset", path });
          const ext = path.slice(path.lastIndexOf(".")).toLowerCase();
          if (ext === ".css") {
            console.log(`${getEmoji("update")} CSS UPDATED -- ${path}`);
            const pages = pagesUsingCss(path);
            if (pages.length === 0) {
              console.log(
                `  ${getEmoji("warning")} no pages reference this stylesheet`,
              );
            } else {
              for (const page of pages) {
                workerRenderPage(page);
              }
              console.log(
                `  ${getEmoji("update")} ${pages.length} page(s) updated`,
              );
            }
          } else if (ext === ".js" && !path.endsWith(".inline.js")) {
            console.log(`${getEmoji("update")} MODULE UPDATED -- ${path}`);
            const pages = pagesUsingModule(path);
            if (pages.length === 0) {
              console.log(
                `  ${getEmoji("warning")} no pages reference this module`,
              );
            } else {
              for (const page of pages) {
                workerRenderPage(page);
              }
              console.log(
                `  ${getEmoji("update")} ${pages.length} page(s) updated`,
              );
            }
          }
        }
      } else if (evtKind === "remove") {
        if (kind === "PAGE_HTML") {
          workerPool.push(`remove:${path}`, { type: "remove-page", path });
        } else if (kind === "ASSET") {
          workerPool.push(`remove:${path}`, { type: "remove-asset", path });
        } else if (kind === "TEMPLATE") {
          console.log(`${getEmoji("delete")} TEMPLATE REMOVED -- ${path}`);
          for (const page of pagesUsingTemplate(path)) {
            workerRenderPage(page);
          }
        }
      }
    }
    await Promise.all([...tasks.values()].map((t) => workerPool.push(t)));
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
