import { fromFileUrl } from "@std/path";
import {
  pagesUsingScript,
  pagesUsingSvg,
  pagesUsingTemplate,
  pagesUsingCss,
  pagesUsingModule,
  recordPageDeps,
} from "./page-deps.js";
import {
  MEDIA_EXTENSIONS,
  SRC_ASSET_EXTENSIONS,
} from "./extension-whitelist.js";
import { getEmoji } from "./emoji.js";
import { classifyPath, reduceEvents } from "./fs-utils.js";

/**
 * Create a pool of worker threads to process tasks concurrently.
 *
 * @param {number} size Number of workers in the pool.
 * @returns {{push: (task: object) => Promise<void>}} Pool interface.
 */
function createPool(size) {
  const workerUrl = new URL("./worker-task.js", import.meta.url);
  const idle = [];
  const queue = [];
  const jobs = new Map();
  let id = 0;

  for (let i = 0; i < size; i++) {
    const w = new Worker(workerUrl.href, { type: "module" });
    w.onmessage = (e) => {
      const job = jobs.get(e.data.id);
      jobs.delete(e.data.id);
      if (e.data.error) {
        job.reject(new Error(e.data.error));
      } else {
        job.resolve();
      }
      if (e.data.deps) {
        recordPageDeps(e.data.deps);
      }
      idle.push(w);
      runNext();
    };
    idle.push(w);
  }

  function runNext() {
    if (queue.length === 0 || idle.length === 0) return;
    const w = idle.pop();
    const job = queue.shift();
    jobs.set(job.data.id, job);
    w.postMessage(job.data);
  }

  function push(task) {
    return new Promise((resolve, reject) => {
      const data = { ...task, id: ++id };
      queue.push({ data, resolve, reject });
      runNext();
    });
  }

  return { push };
}

/**
 * Watch the source and template directories for changes and trigger rebuilds.
 *
 * @param {number} [workers] Number of worker threads to use.
 * @returns {Promise<void>}
 */
export async function watch(workers = navigator.hardwareConcurrency ?? 2) {
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
    console.log(`${getEmoji("warning")} CREATE DIR /template/ -- no need it exists`);
  }

  const srcWatcher = Deno.watchFs(src, { recursive: true })
  console.log(`${getEmoji("success")} CREATING WATCHER /src/`);
 
  const templatesWatcher = Deno.watchFs(templates, { recursive: true }); 
  console.log(`${getEmoji("success")} CREATED WATCHER /templates/`);
  
  const watchers = [ srcWatcher, templatesWatcher ];

  const queue = [];
  let timer;
  const pool = createPool(workers);

  async function flush() {
    const events = queue.splice(0);
    timer = undefined;
    const paths = reduceEvents(events);
    const tasks = new Map();
    for (const [path, evtKind] of paths) {
      const kind = classifyPath(path);
      if (evtKind === "create" || evtKind === "modify") {
        if (kind === "PAGE_HTML") {
          tasks.set(`render:${path}`, { type: "render", path });
        } else if (kind === "TEMPLATE") {
          console.log(`${getEmoji("update")} TEMPLATE UPDATED -- ${path}`);
          for (const page of pagesUsingTemplate(path)) {
            tasks.set(`render:${page}`, { type: "render", path: page });
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
              tasks.set(`render:${page}`, { type: "render", path: page });
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
              tasks.set(`render:${page}`, { type: "render", path: page });
            }
            console.log(
              `  ${getEmoji("update")} ${pages.length} page(s) updated`,
            );
          }
        } else if (kind === "ASSET") {
          tasks.set(`asset:${path}`, { type: "asset", path });
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
                tasks.set(`render:${page}`, { type: "render", path: page });
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
                tasks.set(`render:${page}`, { type: "render", path: page });
              }
              console.log(
                `  ${getEmoji("update")} ${pages.length} page(s) updated`,
              );
            }
          }
        }
      } else if (evtKind === "remove") {
        if (kind === "PAGE_HTML") {
          tasks.set(`remove:${path}`, { type: "remove-page", path });
        } else if (kind === "ASSET") {
          tasks.set(`remove:${path}`, { type: "remove-asset", path });
        } else if (kind === "TEMPLATE") {
          console.log(`${getEmoji("delete")} TEMPLATE REMOVED -- ${path}`);
          for (const page of pagesUsingTemplate(path)) {
            tasks.set(`render:${page}`, { type: "render", path: page });
          }
        }
      }
    }
    await Promise.all([...tasks.values()].map((t) => pool.push(t)));
  }

  async function handle(w) {
    for await (const evt of w) {
      queue.push(evt);
      if (!timer) timer = setTimeout(flush, 50);
    }
  }

  await Promise.all(watchers.map(handle));
}

/**
 * Collapse multiple filesystem events into the most relevant ones.
 *
 * @param {Deno.FsEvent[]} events Events to reduce.
 * @returns {Map<string, string>} Map of paths to final event kinds.
 */
// export function reduceEvents(events) {
//   const map = new Map();
//   for (const evt of events) {
//     for (const path of evt.paths) {
//       const prev = map.get(path);
//       if (!prev) {
//         map.set(path, evt.kind);
//       } else if (prev === evt.kind) {
//         continue;
//       } else if (prev === "create" && evt.kind === "modify") {
//         continue;
//       } else {
//         map.set(path, evt.kind);
//       }
//     }
//   }
//   return map;
// }

/**
 * Classify a filesystem path to determine how it should be handled.
 *
 * @param {string} path Path to classify.
 * @returns {"PAGE_HTML"|"TEMPLATE"|"SVG_INLINE"|"JS_INLINE"|"ASSET"|null} Classification result.
 */
// export function classifyPath(path) {
//   const p = path.replace(/\\/g, "/");
//   const lower = p.toLowerCase();
//   if (lower.endsWith(".html") || lower.endsWith(".md")) return "PAGE_HTML";
//   if (lower.includes("/templates/") && lower.endsWith(".js")) return "TEMPLATE";
//   if (lower.includes("/src-svg/") && lower.endsWith(".svg")) {
//     return "SVG_INLINE";
//   }
//   if (lower.endsWith(".inline.js")) return "JS_INLINE";
//   if (lower.includes("/media/")) {
//     const ext = lower.slice(lower.lastIndexOf("."));
//
//     if (MEDIA_EXTENSIONS.has(ext)) return "ASSET";
//   }
//   if (lower.includes("/src/")) {
//     const ext = lower.slice(lower.lastIndexOf("."));
//     if (SRC_ASSET_EXTENSIONS.has(ext)) return "ASSET";
//   }
//   return null;
// }
