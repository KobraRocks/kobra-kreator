// deno -A --import-map=import_map.json main.js

import { parse } from "@std/flags";
import { walk } from "@std/fs/walk";
import { watch } from "./lib/watch.js";

/**
 * Create a worker pool for rendering tasks.
 *
 * @param {number} size Number of workers to spawn.
 * @returns {{push: (task: object) => Promise<void>}} Pool interface.
 */
function createPool(size) {
  const workerUrl = new URL("./lib/worker-task.js", import.meta.url);
  const idle = [];
  const queue = [];
  const jobs = new Map();
  let id = 0;

  for (let i = 0; i < size; i++) {
    const w = new Worker(workerUrl.href, { type: "module" });
    w.onmessage = (e) => {
      const job = jobs.get(e.data.id);
      jobs.delete(e.data.id);
      if (e.data.error) job.reject(new Error(e.data.error));
      else job.resolve();
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
 * Render all pages using a pool of workers.
 *
 * @param {number} workers Number of workers to use.
 * @returns {Promise<void>}
 */
async function fullBuild(workers) {
  const root = new URL("./src", import.meta.url);
  const pool = createPool(workers);
  const tasks = [];
  try {
    for await (
      const entry of walk(root, { exts: [".html"], includeDirs: false })
    ) {
      tasks.push(pool.push({ type: "render", path: entry.path }));
    }
    await Promise.all(tasks);
  } catch (err) {
    if (!(err instanceof Deno.errors.NotFound)) throw err;
  }
}

if (import.meta.main) {
  const flags = parse(Deno.args, {
    string: ["workers"],
    alias: { w: "workers" },
    default: {
      workers: String(navigator.hardwareConcurrency ?? 2),
    },
  });
  const workers = Number(flags.workers);
  await fullBuild(workers);
  await watch(workers);
}
