import { renderPage } from "../lib/render-page.js";
import {
  clearPageDeps,
  pagesUsingTemplate,
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

Deno.test(
  "adding and removing template overrides re-renders dependent pages",
  async () => {
    clearPageDeps();
    const rootDir = await Deno.makeTempDir();
    const rootUrl = toFileUrl(rootDir + "/");
    const siteDir = await Deno.makeTempDir();
    const distDir = await Deno.makeTempDir();

    await Deno.writeTextFile(
      join(siteDir, "config.json"),
      JSON.stringify({ distantDirectory: distDir }),
    );

    const pagePath = join(siteDir, "index.html");
    await Deno.writeTextFile(
      pagePath,
      `title = "Core"\n[templates]\nhead = "default"\n#---#\n<body></body>`,
    );

    const deps = await renderPage(pagePath, rootUrl);
    if (deps) {
      recordPageDeps(deps);
    }

    const outPath = join(distDir, "index.html");
    let html = await Deno.readTextFile(outPath);
    assert(html.includes("<title>Core</title>"));

    const tplPath = join(rootDir, "templates", "head", "default.js");
    await Deno.mkdir(join(rootDir, "templates", "head"), { recursive: true });
    await Deno.writeTextFile(
      tplPath,
      "export function render() { return `<title>Override</title>`; }",
    );

    let events = [{ kind: "create", paths: [tplPath] }];
    let paths = reduceEvents(events);
    for (const [path, evtKind] of paths) {
      const type = classifyPath(path);
      if ((evtKind === "create" || evtKind === "modify") && type === "TEMPLATE") {
        for (const page of pagesUsingTemplate(path)) {
          const d = await renderPage(page, rootUrl);
          if (d) {
            recordPageDeps(d);
          }
        }
      }
    }

    html = await Deno.readTextFile(outPath);
    assert(html.includes("<title>Override</title>"));

    await Deno.remove(tplPath);

    events = [{ kind: "remove", paths: [tplPath] }];
    paths = reduceEvents(events);
    for (const [path, evtKind] of paths) {
      const type = classifyPath(path);
      if (evtKind === "remove" && type === "TEMPLATE") {
        for (const page of pagesUsingTemplate(path)) {
          const d = await renderPage(page, rootUrl);
          if (d) {
            recordPageDeps(d);
          }
        }
      }
    }

    html = await Deno.readTextFile(outPath);
    assert(html.includes("<title>Core</title>"));

    await Deno.remove(rootDir, { recursive: true });
  },
);
