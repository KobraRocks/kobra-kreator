import { classifyPath, reduceEvents } from "./watch.js";
import {
  pagesUsingCss,
  pagesUsingModule,
  recordPageDeps,
  clearPageDeps,
} from "./page-deps.js";
import { renderPage } from "./render-page.js";
import { join, toFileUrl } from "@std/path";
import { assertEquals, assertNotEquals } from "@std/assert";

denoTest();

function denoTest() {
  Deno.test("reduceEvents dedupes and promotes", () => {
    const events = [
      { kind: "create", paths: ["/a.html"] },
      { kind: "modify", paths: ["/a.html"] },
      { kind: "modify", paths: ["/a.html"] },
    ];
    const res = reduceEvents(events);
    assertEquals(res.get("/a.html"), "create");
  });

  Deno.test("reduceEvents handles remove", () => {
    const events = [
      { kind: "remove", paths: ["/a.html"] },
      { kind: "remove", paths: ["/a.html"] },
    ];
    const res = reduceEvents(events);
    assertEquals(res.get("/a.html"), "remove");
  });

  Deno.test("classifyPath identifies types", () => {
    assertEquals(classifyPath("/src/site/page.html"), "PAGE_HTML");
    assertEquals(classifyPath("/templates/head.js"), "TEMPLATE");
    assertEquals(classifyPath("/src/site/src-svg/icon.svg"), "SVG_INLINE");
    assertEquals(classifyPath("/src/site/foo.inline.js"), "JS_INLINE");
    assertEquals(classifyPath("/src/site/js/app.js"), "ASSET");
    assertEquals(classifyPath("/src/site/media/logo.png"), "ASSET");
  });

  Deno.test("modifying css triggers re-render with updated hash", async () => {
    clearPageDeps();
    const root = await Deno.makeTempDir();
    const dist = join(root, "dist");
    await Deno.writeTextFile(
      join(root, "config.json"),
      JSON.stringify({ distantDirectory: dist, hashAssets: true }),
    );
    await Deno.mkdir(join(root, "templates", "head"), { recursive: true });
    await Deno.copyFile(
      join(Deno.cwd(), "tests", "templates", "head", "default.js"),
      join(root, "templates", "head", "base.js"),
    );
    const cssPath = join(root, "style.css");
    await Deno.writeTextFile(cssPath, "body{color:red;}");
    const pagePath = join(root, "index.html");
    await Deno.writeTextFile(
      pagePath,
      [
        'title = "Home"',
        'templates.head = "base"',
        'css = ["style.css"]',
        '#---#',
        '<h1>hi</h1>',
      ].join("\n"),
    );
    const deps1 = await renderPage(pagePath, toFileUrl(root + "/"));
    if (!deps1) throw new Error("render failed");
    recordPageDeps(
      deps1.pagePath,
      deps1.templatesUsed,
      deps1.svgsUsed,
      deps1.scriptsUsed,
      deps1.cssUsed,
      deps1.modulesUsed,
    );
    const out1 = await Deno.readTextFile(join(dist, "index.html"));
    const cssHref1 = out1.match(/href="([^"]+)"/)[1];
    await Deno.writeTextFile(cssPath, "body{color:blue;}");
    const pages = pagesUsingCss(cssPath);
    assertEquals(pages, [pagePath]);
    await renderPage(pagePath, toFileUrl(root + "/"));
    const out2 = await Deno.readTextFile(join(dist, "index.html"));
    const cssHref2 = out2.match(/href="([^"]+)"/)[1];
    assertNotEquals(cssHref1, cssHref2);
  });

  Deno.test("modifying module triggers re-render with updated hash", async () => {
    clearPageDeps();
    const root = await Deno.makeTempDir();
    const dist = join(root, "dist");
    await Deno.writeTextFile(
      join(root, "config.json"),
      JSON.stringify({ distantDirectory: dist, hashAssets: true }),
    );
    await Deno.mkdir(join(root, "templates", "head"), { recursive: true });
    await Deno.copyFile(
      join(Deno.cwd(), "tests", "templates", "head", "default.js"),
      join(root, "templates", "head", "base.js"),
    );
    const modulePath = join(root, "mod.js");
    await Deno.writeTextFile(modulePath, "console.log('a');");
    const pagePath = join(root, "index.html");
    await Deno.writeTextFile(
      pagePath,
      [
        'title = "Home"',
        'templates.head = "base"',
        'scripts.modules = ["mod.js"]',
        '#---#',
        '<h1>hi</h1>',
      ].join("\n"),
    );
    const deps1 = await renderPage(pagePath, toFileUrl(root + "/"));
    if (!deps1) throw new Error("render failed");
    recordPageDeps(
      deps1.pagePath,
      deps1.templatesUsed,
      deps1.svgsUsed,
      deps1.scriptsUsed,
      deps1.cssUsed,
      deps1.modulesUsed,
    );
    const out1 = await Deno.readTextFile(join(dist, "index.html"));
    const src1 = out1.match(/src="([^"]+)"/)[1];
    await Deno.writeTextFile(modulePath, "console.log('b');");
    const pages = pagesUsingModule(modulePath);
    assertEquals(pages, [pagePath]);
    await renderPage(pagePath, toFileUrl(root + "/"));
    const out2 = await Deno.readTextFile(join(dist, "index.html"));
    const src2 = out2.match(/src="([^"]+)"/)[1];
    assertNotEquals(src1, src2);
  });
}
