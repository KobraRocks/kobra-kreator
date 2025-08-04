import { renderPage } from "../lib/render-page.js";
import {
  clearPageDeps,
  pagesWithLinks,
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

Deno.test("watch re-renders pages when links.json changes", async () => {
  clearPageDeps();
  const rootDir = await Deno.makeTempDir();
  const rootUrl = toFileUrl(rootDir + "/");
  const siteDir = await Deno.makeTempDir();
  const distDir = await Deno.makeTempDir();

  await Deno.writeTextFile(
    join(siteDir, "config.json"),
    JSON.stringify({ distantDirectory: distDir }),
  );

  await Deno.mkdir(join(rootDir, "templates", "head"), { recursive: true });
  await Deno.writeTextFile(
    join(rootDir, "templates", "head", "default.js"),
    "export function render() { return `<title>Watch</title>`; }",
  );
  await Deno.mkdir(join(rootDir, "templates", "nav"), { recursive: true });
  await Deno.writeTextFile(
    join(rootDir, "templates", "nav", "default.js"),
    "export function render({ links }) { return `<nav>${links.nav.map(l=>l.label).join(',')}</nav>`; }",
  );

  const pagePath = join(siteDir, "index.html");
  const page =
    `title = "Watch"\n[templates]\nhead = "default"\nnav = "default"\n[links.nav]\nlabel = "Home"\ntopLevel = true\n#---#\n<body></body>`;
  await Deno.writeTextFile(pagePath, page);

  let deps = await renderPage(pagePath, rootUrl);
  if (deps) recordPageDeps(deps);

  const outPath = join(distDir, "index.html");
  let html = await Deno.readTextFile(outPath);
  assert(html.includes("<nav>Home</nav>"));

  const linksPath = join(siteDir, "links.json");
  const links = JSON.parse(await Deno.readTextFile(linksPath));
  links.nav.push({ href: "/about.html", label: "About" });
  await Deno.writeTextFile(linksPath, JSON.stringify(links, null, 2));

  const events = [{ kind: "modify", paths: [linksPath] }];
  const paths = reduceEvents(events);
  const tasks = [];
  for (const [path, evtKind] of paths) {
    const kind = classifyPath(path);
    if (evtKind !== "remove" && kind === "LINKS_JSON") {
      for (const page of pagesWithLinks()) {
        tasks.push(page);
      }
    }
  }
  assert(tasks.length > 0, "no tasks scheduled");
  for (const page of tasks) {
    deps = await renderPage(page, rootUrl);
    if (deps) recordPageDeps(deps);
  }

  html = await Deno.readTextFile(outPath);
  assert(html.includes("<nav>Home,About</nav>"));

  await Deno.remove(rootDir, { recursive: true });
  await Deno.remove(siteDir, { recursive: true });
  await Deno.remove(distDir, { recursive: true });
});
