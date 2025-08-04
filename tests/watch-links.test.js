import { renderPage } from "../lib/render-page.js";
import {
  clearPageDeps,
  pagesWithLinks,
  recordPageDeps,
} from "../lib/page-deps.js";
import { classifyPath, reduceEvents } from "../lib/fs-utils.js";
import { join, toFileUrl } from "@std/path";

function assert(cond, msg = "Assertion failed") {
  if (!cond) throw new Error(msg);
}

Deno.test(
  "manual links.json edits ignored; front-matter changes rerender dependents",
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

    const indexPath = join(siteDir, "index.html");
    const indexPage = [
      'title = "Watch"',
      '[templates]',
      'head = "default"',
      'nav = "default"',
      '[links.nav]',
      'label = "Home"',
      'topLevel = true',
      '#---#',
      '<body></body>',
    ].join("\n");
    await Deno.writeTextFile(indexPath, indexPage);

    const aboutPath = join(siteDir, "about.html");
    const aboutPage = [
      'title = "About"',
      '[templates]',
      'head = "default"',
      'nav = "default"',
      '[links.nav]',
      'label = "About"',
      '#---#',
      '<body></body>',
    ].join("\n");
    await Deno.writeTextFile(aboutPath, aboutPage);

    // Initial render of both pages
    for (const p of [indexPath, aboutPath]) {
      const deps = await renderPage(p, rootUrl);
      if (deps) recordPageDeps(deps);
    }

    let aboutHtml = await Deno.readTextFile(join(distDir, "about.html"));
    assert(aboutHtml.includes("<nav>Home,About</nav>"));

    // Manually edit links.json and ensure no re-render tasks are scheduled
    const linksPath = join(siteDir, "links.json");
    const links = JSON.parse(await Deno.readTextFile(linksPath));
    links.nav[0].label = "Manual";
    await Deno.writeTextFile(linksPath, JSON.stringify(links, null, 2));

    const events = [{ kind: "modify", paths: [linksPath] }];
    const paths = reduceEvents(events);
    const tasks = [];
    for (const [p, evtKind] of paths) {
      const kind = classifyPath(p);
      if (evtKind !== "remove") {
        if (kind === "PAGE_HTML") tasks.push(p);
        // no branch for LINKS_JSON
      }
    }
    assert(tasks.length === 0, "links.json edit triggered tasks");

    aboutHtml = await Deno.readTextFile(join(distDir, "about.html"));
    assert(aboutHtml.includes("<nav>Home,About</nav>"));

    // Change front-matter label and trigger dependent re-renders
    const updatedIndex = [
      'title = "Watch"',
      '[templates]',
      'head = "default"',
      'nav = "default"',
      '[links.nav]',
      'label = "Start"',
      'topLevel = true',
      '#---#',
      '<body></body>',
    ].join("\n");
    await Deno.writeTextFile(indexPath, updatedIndex);

    let deps = await renderPage(indexPath, rootUrl);
    if (deps) {
      recordPageDeps(deps);
      if (deps.linksChanged) {
        for (const page of pagesWithLinks()) {
          if (page !== indexPath) {
            const d = await renderPage(page, rootUrl);
            if (d) recordPageDeps(d);
          }
        }
      }
    }

    aboutHtml = await Deno.readTextFile(join(distDir, "about.html"));
    assert(aboutHtml.includes("<nav>Start,About</nav>"));

    await Deno.remove(rootDir, { recursive: true });
    await Deno.remove(siteDir, { recursive: true });
    await Deno.remove(distDir, { recursive: true });
  },
);
