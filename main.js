// deno -A --import-map=import_map.json main.js

import { parse } from "@std/flags";
import { walk } from "@std/fs/walk";
import { watch } from "./lib/watch.js";
import { recordPageDeps } from "./lib/page-deps.js";
import { WorkerPool } from "./lib/worker-pool.js";

/**
 * Render all pages using a pool of workers.
 *
 * @param {number} workers Number of workers to use.
 * @returns {Promise<void>}
 */
async function fullBuild(workers) {
  const root = new URL("./src", import.meta.url);
  // The WorkerPool handles worker lifecycle and propagates errors so the
  // build process does not hang if a worker crashes.
  const pool = new WorkerPool(
    new URL("./lib/worker-task.js", import.meta.url).href,
    workers,
  );
  const tasks = [];
  try {
    for await (
      const entry of walk(root, { exts: [".html"], includeDirs: false })
    ) {
      tasks.push(
        pool.push(
          { type: "render", path: entry.path },
          [
            (e) => {
              if (e.data.deps) {
                recordPageDeps(e.data.deps);
              }
            },
          ],
        ),
      );
    }
    await Promise.all(tasks);
  } catch (err) {
    if (!(err instanceof Deno.errors.NotFound)) throw err;
  } finally {
    // Ensure all workers are terminated to avoid locking subsequent runs.
    pool.close();
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
