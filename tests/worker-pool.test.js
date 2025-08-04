import { WorkerPool } from "../lib/worker-pool.js";
import { assert, assertEquals } from "@std/assert";
import { toFileUrl } from "@std/path";

/**
 * Create a temporary worker script and return its location.
 *
 * @param {string} code JavaScript source for the worker.
 * @returns {Promise<{url: URL, path: string}>}
 */
async function createWorker(code) {
  const path = await Deno.makeTempFile({ suffix: ".js" });
  await Deno.writeTextFile(path, code);
  return { url: toFileUrl(path), path };
}

Deno.test("WorkerPool resolves task results", async () => {
  const { url, path } = await createWorker(`
    self.onmessage = (e) => {
      const { id, num } = e.data;
      self.postMessage({ id, result: num * 2 });
    };
  `);

  const pool = new WorkerPool(url.href, 1);
  try {
    const result = await pool.push({ num: 21 });
    assertEquals(result, 42);
  } finally {
    pool.close();
    await Deno.remove(path);
  }
});

Deno.test("WorkerPool invokes callbacks", async () => {
  const { url, path } = await createWorker(`
    self.onmessage = (e) => {
      const { id, msg } = e.data;
      self.postMessage({ id, result: msg });
    };
  `);

  const pool = new WorkerPool(url.href, 1);
  try {
    let called = false;
    const result = await pool.push({ msg: "hello" }, [
      /**
       * Capture messages from the worker.
       * @param {MessageEvent} e Message event from the worker.
       */
      (e) => {
        if (e.data.result === "hello") called = true;
      },
    ]);
    assertEquals(result, "hello");
    assert(called);
  } finally {
    pool.close();
    await Deno.remove(path);
  }
});

Deno.test("WorkerPool close clears internal state", async () => {
  const { url, path } = await createWorker(`
    self.onmessage = (e) => {
      const { id } = e.data;
      self.postMessage({ id });
    };
  `);

  const pool = new WorkerPool(url.href, 1);
  await pool.push({});
  pool.close();
  assertEquals(pool.idle.length, 0);
  assertEquals(pool.queue.length, 0);
  assertEquals(pool.jobs.size, 0);
  await Deno.remove(path);
});
