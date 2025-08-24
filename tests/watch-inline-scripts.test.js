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
  for (const t of tasks) {
    const d = await renderPage(t.path, rootUrl);
    if (d) recordPageDeps(d);
  }

  html = await Deno.readTextFile(outPath);
  assert(html.includes('console.log("two")'));

  await Deno.remove(join(rootDir, "templates"), { recursive: true });
});
