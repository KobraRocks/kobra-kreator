import { renderPage } from "../lib/render-page.js";
import {
  clearPageDeps,
  pagesUsingScript,
  recordPageDeps,
} from "../lib/page-deps.js";
import { classifyPath, reduceEvents } from "../lib/fs-utils.js";
import { join, toFileUrl } from "@std/path";

/**
 * Simple assertion helper.
 * @param {unknown} cond Condition expected to be truthy.
 * @param {string} [msg] Optional assertion message.
 */
function assert(cond, msg = "Assertion failed") {
  if (!cond) throw new Error(msg);
}

/**
 * Create a minimal worker pool mirroring watch.js for tests.
 *
 * @param {number} size Number of workers in the pool.
 * @returns {{push: (task: {type: string; path: string}) => Promise<void>, close: () => void}}
 */
function createPool(size) {
  const workerUrl = new URL("../lib/worker-task.js", import.meta.url);
  /** @type {Worker[]} */
  const workers = [];
  /** @type {Worker[]} */
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
      idle.push(w);
      runNext();
    };
    workers.push(w);
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

  function close() {
    for (const w of workers) w.terminate();
  }

  return { push, close };
}

Deno.test("watch re-renders pages when inline scripts change", async () => {
  clearPageDeps();
  const rootDir = Deno.cwd();
  const rootUrl = toFileUrl(rootDir + "/");
  const siteDir = await Deno.makeTempDir();
  const distDir = await Deno.makeTempDir();

  await Deno.writeTextFile(
    join(siteDir, "config.json"),
    JSON.stringify({ distantDirectory: distDir }),
  );

  const scriptFile = join(siteDir, "foo.inline.js");
  await Deno.writeTextFile(scriptFile, "console.log('one');");

  await Deno.mkdir(join(rootDir, "templates", "head"), { recursive: true });
  await Deno.writeTextFile(
    join(rootDir, "templates", "head", "default.js"),
    "export function render() { return `<title>Watch</title>`; }",
  );

  const pagePath = join(siteDir, "index.html");
  const page =
    `title = "Watch"\n[scripts]\ninline = ["foo.inline.js"]\n[templates]\nhead = "default"\n#---#\n<body></body>`;
  await Deno.writeTextFile(pagePath, page);

  const deps = await renderPage(pagePath, rootUrl);
  if (deps) {
    recordPageDeps(deps);
  }

  const outPath = join(distDir, "index.html");
  let html = await Deno.readTextFile(outPath);
  assert(html.includes('console.log("one")'));

  await Deno.writeTextFile(scriptFile, "console.log('two');");

  const events = [{ kind: "modify", paths: [scriptFile] }];
  const paths = reduceEvents(events);
  const tasks = [];
  for (const [path, evtKind] of paths) {
    const type = classifyPath(path);
    if (
      (evtKind === "create" || evtKind === "modify") && type === "JS_INLINE"
    ) {
      for (const page of pagesUsingScript(path)) {
        tasks.push({ type: "render", path: page });
      }
    }
  }
  assert(tasks.length > 0, "no tasks scheduled");
  const pool = createPool(1);
  await Promise.all(tasks.map((t) => pool.push(t)));
  pool.close();

  html = await Deno.readTextFile(outPath);
  assert(html.includes('console.log("two")'));

  await Deno.remove(join(rootDir, "templates"), { recursive: true });
});
