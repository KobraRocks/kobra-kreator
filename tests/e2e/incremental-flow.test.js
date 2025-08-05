/**
 * @fileoverview End-to-end test covering incremental page features.
 */
import { renderPage } from "../../lib/render-page.js";
import {
  clearPageDeps,
  recordPageDeps,
  pagesUsingScript,
  pagesUsingSvg,
  pagesWithLinks,
} from "../../lib/page-deps.js";
import { copyAsset } from "../../lib/copy-asset.js";
import { join, toFileUrl } from "@std/path";
import { DOMParser } from "@b-fuze/deno-dom";

/**
 * Assert helper.
 * @param {unknown} cond Condition expected to be truthy.
 * @param {string} [msg] Optional assertion message.
 */
function assert(cond, msg = "Assertion failed") {
  if (!cond) throw new Error(msg);
}

/**
 * Assert equality helper using JSON.stringify.
 * @param {unknown} a First value.
 * @param {unknown} b Second value.
 */
function assertEquals(a, b) {
  const da = JSON.stringify(a);
  const db = JSON.stringify(b);
  if (da !== db) throw new Error(`Expected ${db}, got ${da}`);
}

/**
 * Check whether a path exists.
 * @param {string} path File path.
 * @returns {Promise<boolean>} Whether file exists.
 */
async function fileExists(path) {
  try {
    await Deno.stat(path);
    return true;
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) return false;
    throw err;
  }
}

Deno.test("incremental end-to-end flow", async () => {
  clearPageDeps();
  let step = 0;
  const log = (msg) => console.log(`${step++}. ${msg}`);
  let doc;
  let inlineScript;

  const root = await Deno.makeTempDir();
  const rootUrl = toFileUrl(root + "/");
  const siteDir = join(root, "mysite");
  const distDir = join(root, "dist");
  await Deno.mkdir(siteDir, { recursive: true });
  await Deno.mkdir(distDir, { recursive: true });

  log("End to End test start");

  // Step 1
  log("create config.json");
  await Deno.writeTextFile(
    join(siteDir, "config.json"),
    JSON.stringify({ distantDirectory: distDir }),
  );

  // Prepare templates
  await Deno.mkdir(join(root, "templates", "head"), { recursive: true });
  await Deno.writeTextFile(
    join(root, "templates", "head", "default.js"),
    [
      "export function render({ frontMatter }) {",
      '  const cssLinks = (frontMatter.css || []).map((href) => `<link rel=\\"stylesheet\\" href=\\"${href}\\">`).join(\"\");',
      "  const desc = frontMatter.description ? `<meta name=\\\"description\\\" content=\\\"${frontMatter.description}\\\">` : '';",
      "  return `<title>${frontMatter.title}</title>${desc}${cssLinks}`;",
      "}",
    ].join("\n"),
  );
  await Deno.mkdir(join(root, "templates", "nav"), { recursive: true });
  await Deno.writeTextFile(
    join(root, "templates", "nav", "default.js"),
    "export function render() { return `<nav></nav>`; }",
  );
  await Deno.mkdir(join(root, "templates", "footer"), { recursive: true });
  await Deno.writeTextFile(
    join(root, "templates", "footer", "default.js"),
    "export function render() { return `<footer></footer>`; }",
  );

  const TPL = '[templates]\nhead = "default"\nnav = "default"\nfooter = "default"';

  // Step 2
  log("created source html file rendered in destination folder");
  const pagePath = join(siteDir, "index.html");
  const page1 = `title = "Home"\n${TPL}\n#---#\n<body>Hello</body>`;
  await Deno.writeTextFile(pagePath, page1);
  let deps = await renderPage(pagePath, rootUrl);
  if (deps) recordPageDeps(deps);
  let html = await Deno.readTextFile(join(distDir, "index.html"));
  assert(html.includes("<title>Home</title>"));

  // Step 3
  log("updated source html file with description, destination file rerendered");
  const page2 = `title = "Home"\ndescription = "My site"\n${TPL}\n#---#\n<body>Hello</body>`;
  await Deno.writeTextFile(pagePath, page2);
  deps = await renderPage(pagePath, rootUrl);
  if (deps) recordPageDeps(deps);
  html = await Deno.readTextFile(join(distDir, "index.html"));
  assert(html.includes('name="description"'));

  // Step 4
  log("created source css file copied into destination folder");
  const cssPath = join(siteDir, "styles.css");
  await Deno.writeTextFile(cssPath, "body{color:red;}");
  await copyAsset(cssPath);
  assert(await fileExists(join(distDir, "styles.css")));

  // Step 5
  log("updated source html file with css link, destination file rerendered");
  const page3 = `title = "Home"\ndescription = "My site"\ncss = ["styles.css"]\n${TPL}\n#---#\n<body>Hello</body>`;
  await Deno.writeTextFile(pagePath, page3);
  deps = await renderPage(pagePath, rootUrl);
  if (deps) recordPageDeps(deps);
  html = await Deno.readTextFile(join(distDir, "index.html"));
  assert(html.includes("styles.css"));

  // Step 6
  log(
    "added nav links to source html file, destination file rerendered and links.json created",
  );
  const page4 = `title = "Home"\ndescription = "My site"\ncss = ["styles.css"]\n${TPL}\n[links.nav]\nlabel = "Home"\n#---#\n<body>Hello</body>`;
  await Deno.writeTextFile(pagePath, page4);
  deps = await renderPage(pagePath, rootUrl);
  if (deps) recordPageDeps(deps);
  let links = JSON.parse(await Deno.readTextFile(join(siteDir, "links.json")));
  assertEquals(links.nav.length, 1);
  assertEquals(links.nav[0].label, "Home");

  // Step 7
  log(
    "added footer links to source html file, destination file rerendered and links.json updated",
  );
  const page5 = `title = "Home"\ndescription = "My site"\ncss = ["styles.css"]\n${TPL}\n[links.nav]\nlabel = "Home"\n[links.footer]\nlabel = "Docs"\n#---#\n<body>Hello</body>`;
  await Deno.writeTextFile(pagePath, page5);
  deps = await renderPage(pagePath, rootUrl);
  if (deps) recordPageDeps(deps);
  links = JSON.parse(await Deno.readTextFile(join(siteDir, "links.json")));
  assertEquals(links.footer.length, 1);
  assertEquals(links.footer[0].label, "Docs");

  // Step 8
  log("created source inline script file, NOT copied in destination folder");
  const inlinePath = join(siteDir, "inline.inline.js");
  await Deno.writeTextFile(inlinePath, "console.log('one');");
  assert(!(await fileExists(join(distDir, "inline.inline.js"))));

  // Step 9
  log("added source inline script to html file, destination file rerendered");
  const page6 = `title = "Home"\ndescription = "My site"\ncss = ["styles.css"]\n[scripts]\ninline = ["inline.inline.js"]\n${TPL}\n[links.nav]\nlabel = "Home"\n[links.footer]\nlabel = "Docs"\n#---#\n<body>Hello</body>`;
  await Deno.writeTextFile(pagePath, page6);
  deps = await renderPage(pagePath, rootUrl);
  if (deps) recordPageDeps(deps);
  html = await Deno.readTextFile(join(distDir, "index.html"));
  doc = new DOMParser().parseFromString(html, "text/html");
  inlineScript = Array.from(doc.querySelectorAll("script"))
    .find((s) => !s.getAttribute("src"));
  assert(inlineScript && inlineScript.textContent?.includes("one"));

  // Step 10
  log("created source javascript module file copied into destination folder");
  const jsDir = join(siteDir, "js");
  await Deno.mkdir(jsDir, { recursive: true });
  const jsPath = join(jsDir, "app.js");
  await Deno.writeTextFile(jsPath, "console.log('mod');");
  await copyAsset(jsPath);
  assert(await fileExists(join(distDir, "js", "app.js")));

  // Step 11
  log("added source javascript module to html file, destination file rerendered");
  const page7 = `title = "Home"\ndescription = "My site"\ncss = ["styles.css"]\n[scripts]\ninline = ["inline.inline.js"]\nmodules = ["/js/app.js"]\n${TPL}\n[links.nav]\nlabel = "Home"\n[links.footer]\nlabel = "Docs"\n#---#\n<body>Hello</body>`;
  await Deno.writeTextFile(pagePath, page7);
  deps = await renderPage(pagePath, rootUrl);
  if (deps) recordPageDeps(deps);
  html = await Deno.readTextFile(join(distDir, "index.html"));
  assert(html.includes('type="module"'));
  assert(html.includes('/js/app.js'));

  // Step 12
  log("created source /src-svg/file.svg, NOT copied in destination folder");
  const svgDir = join(siteDir, "src-svg");
  await Deno.mkdir(svgDir, { recursive: true });
  const svgPath = join(svgDir, "file.svg");
  await Deno.writeTextFile(svgPath, "<svg><circle /></svg>");
  assert(!(await fileExists(join(distDir, "src-svg", "file.svg"))));

  // Step 13
  log("added <icon src=\"file.svg\"></icon> to html file, destination file rerendered");
  const page8 = `title = "Home"\ndescription = "My site"\ncss = ["styles.css"]\n[scripts]\ninline = ["inline.inline.js"]\nmodules = ["/js/app.js"]\n${TPL}\n[links.nav]\nlabel = "Home"\n[links.footer]\nlabel = "Docs"\n#---#\n<body><icon src="file.svg"></icon></body>`;
  await Deno.writeTextFile(pagePath, page8);
  deps = await renderPage(pagePath, rootUrl);
  if (deps) recordPageDeps(deps);
  html = await Deno.readTextFile(join(distDir, "index.html"));
  doc = new DOMParser().parseFromString(html, "text/html");
  assert(doc && doc.querySelectorAll("svg").length === 1);

  // Step 14
  log("added <logo src=\"file.svg\"></logo> to html file, destination file rerendered");
  const page9 = `title = "Home"\ndescription = "My site"\ncss = ["styles.css"]\n[scripts]\ninline = ["inline.inline.js"]\nmodules = ["/js/app.js"]\n${TPL}\n[links.nav]\nlabel = "Home"\n[links.footer]\nlabel = "Docs"\n#---#\n<body><icon src="file.svg"></icon><logo src="file.svg"></logo></body>`;
  await Deno.writeTextFile(pagePath, page9);
  deps = await renderPage(pagePath, rootUrl);
  if (deps) recordPageDeps(deps);
  html = await Deno.readTextFile(join(distDir, "index.html"));
  doc = new DOMParser().parseFromString(html, "text/html");
  assert(doc && doc.querySelectorAll("svg").length === 2);

  // Step 15
  log("created source markdown file rendered in destination folder");
  const mdPath = join(siteDir, "about.md");
  const md1 = `title = "About"\n${TPL}\n[links.nav]\nlabel = "About"\n#---#\nHello`;
  await Deno.writeTextFile(mdPath, md1);
  deps = await renderPage(mdPath, rootUrl);
  if (deps) recordPageDeps(deps);
  assert(await fileExists(join(distDir, "about.html")));
  links = JSON.parse(await Deno.readTextFile(join(siteDir, "links.json")));
  assertEquals(links.nav.length, 2);

  // Step 16
  log("added source inline script to markdown file, destination file rerendered");
  const md2 = `title = "About"\n[scripts]\ninline = ["inline.inline.js"]\n${TPL}\n[links.nav]\nlabel = "About"\n#---#\nHello`;
  await Deno.writeTextFile(mdPath, md2);
  deps = await renderPage(mdPath, rootUrl);
  if (deps) recordPageDeps(deps);
  let aboutHtml = await Deno.readTextFile(join(distDir, "about.html"));
  doc = new DOMParser().parseFromString(aboutHtml, "text/html");
  inlineScript = Array.from(doc.querySelectorAll("script"))
    .find((s) => !s.getAttribute("src"));
  assert(inlineScript && inlineScript.textContent?.includes("one"));

  // Step 17
  log("added <icon src=\"file.svg\"></icon> to markdown file, destination file rerendered");
  const md3 = `title = "About"\n[scripts]\ninline = ["inline.inline.js"]\n${TPL}\n[links.nav]\nlabel = "About"\n#---#\nHello <icon src="file.svg"></icon>`;
  await Deno.writeTextFile(mdPath, md3);
  deps = await renderPage(mdPath, rootUrl);
  if (deps) recordPageDeps(deps);
  aboutHtml = await Deno.readTextFile(join(distDir, "about.html"));
  doc = new DOMParser().parseFromString(aboutHtml, "text/html");
  assert(doc && doc.querySelectorAll("svg").length === 1);

  // Step 18
  log("updated source inline script file, rendered each file referencing the script");
  await Deno.writeTextFile(inlinePath, "console.log('two');");
  for (const p of pagesUsingScript(inlinePath)) {
    const d = await renderPage(p, rootUrl);
    if (d) recordPageDeps(d);
  }
  html = await Deno.readTextFile(join(distDir, "index.html"));
  doc = new DOMParser().parseFromString(html, "text/html");
  inlineScript = Array.from(doc.querySelectorAll("script"))
    .find((s) => !s.getAttribute("src"));
  assert(inlineScript && inlineScript.textContent?.includes("two"));
  aboutHtml = await Deno.readTextFile(join(distDir, "about.html"));
  doc = new DOMParser().parseFromString(aboutHtml, "text/html");
  inlineScript = Array.from(doc.querySelectorAll("script"))
    .find((s) => !s.getAttribute("src"));
  assert(inlineScript && inlineScript.textContent?.includes("two"));

  // Step 19
  log(
    "updated source /src-svg/file.svg, rendered each file referencing the script in icon tags or logo tags",
  );
  await Deno.writeTextFile(svgPath, "<svg><rect /></svg>");
  for (const p of pagesUsingSvg(svgPath)) {
    const d = await renderPage(p, rootUrl);
    if (d) recordPageDeps(d);
  }
  html = await Deno.readTextFile(join(distDir, "index.html"));
  aboutHtml = await Deno.readTextFile(join(distDir, "about.html"));
  assert(html.includes("<rect"));
  assert(aboutHtml.includes("<rect"));

  // Step 20
  log(
    "remove source markdown file from nav links, rendered each pages having nav links",
  );
  const md4 = `title = "About"\n[scripts]\ninline = ["inline.inline.js"]\n${TPL}\n#---#\nHello <icon src="file.svg"></icon>`;
  await Deno.writeTextFile(mdPath, md4);
  deps = await renderPage(mdPath, rootUrl);
  if (deps) recordPageDeps(deps);
  for (const p of pagesWithLinks()) {
    const d = await renderPage(p, rootUrl);
    if (d) recordPageDeps(d);
  }
  links = JSON.parse(await Deno.readTextFile(join(siteDir, "links.json")));
  assertEquals(links.nav.length, 1);
  assertEquals(links.nav[0].label, "Home");

  await Deno.remove(root, { recursive: true });
});
