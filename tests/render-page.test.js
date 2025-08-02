import { renderPage } from "../lib/render-page.js";
import { clearPageDeps, pageDeps } from "../lib/page-deps.js";
import { join, toFileUrl } from "@std/path";
import { DOMParser } from "@b-fuze/deno-dom";

function assert(cond, msg = "Assertion failed") {
  if (!cond) throw new Error(msg);
}
function assertEquals(a, b) {
  const da = JSON.stringify(a);
  const db = JSON.stringify(b);
  if (da !== db) throw new Error(`Expected ${db}, got ${da}`);
}

Deno.test("renderPage renders page and updates links", async () => {
  clearPageDeps();
  const root = await Deno.makeTempDir();
  const rootUrl = toFileUrl(root + "/");
  const siteDir = join(root, "mysite");
  const distDir = join(root, "dist");
  await Deno.mkdir(siteDir, { recursive: true });
  await Deno.mkdir(distDir, { recursive: true });

  await Deno.writeTextFile(
    join(siteDir, "config.json"),
    JSON.stringify({ distantDirectory: distDir }),
  );
  await Deno.writeTextFile(join(siteDir, "inline.js"), "console.log('hi');");
  await Deno.mkdir(join(siteDir, "src-svg", "ui"), { recursive: true });
  await Deno.writeTextFile(
    join(siteDir, "src-svg", "ui", "check.svg"),
    "<svg><path/></svg>",
  );

  await Deno.mkdir(join(root, "templates", "head"), { recursive: true });
  await Deno.mkdir(join(root, "templates", "nav"), { recursive: true });
  await Deno.mkdir(join(root, "templates", "footer"), { recursive: true });
  await Deno.writeTextFile(
    join(root, "templates", "head", "default.js"),
    "export function render({ frontMatter }) { return `<title>${frontMatter.title}</title>`; }",
  );
  await Deno.writeTextFile(
    join(root, "templates", "nav", "default.js"),
    "export function render() { return `<nav>nav</nav>`; }",
  );
  await Deno.writeTextFile(
    join(root, "templates", "footer", "default.js"),
    "export function render() { return `<footer>foot</footer>`; }",
  );

  await Deno.mkdir(join(siteDir, "blog"), { recursive: true });
  const pagePath = join(siteDir, "blog", "index.html");
  const page =
    `title = "Hello"\ncss = ["styles.css"]\n[scripts]\nmodules = ["/js/app.js"]\ninline = ["inline.js"]\n[templates]\nhead = "default"\nnav = "default"\nfooter = "default"\n[links.nav]\ntopLevel = true\nlabel = "Home"\n#---#\n<body><icon src="ui/check.svg"></icon></body>`;
  await Deno.writeTextFile(pagePath, page);

  await renderPage(pagePath, rootUrl);

  const outPath = join(distDir, "blog", "index.html");
  const html = await Deno.readTextFile(outPath);
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  assert(doc);
  assert(doc.querySelector("nav")?.textContent === "nav");
  assert(doc.querySelector("footer")?.textContent === "foot");
  assert(
    doc.querySelector('link[rel="stylesheet"][href="styles.css"]'),
  );
  assert(
    doc.querySelector('script[type="module"][src="/js/app.js"]'),
  );
  const inlineScript = Array.from(doc.querySelectorAll("script")).find(
    (s) => !s.getAttribute("src"),
  );
  assert(inlineScript?.textContent.includes("console.log"));
  assert(doc.querySelector("svg path"));

  assert(html.includes("\n  <head>\n"));

  const links = JSON.parse(
    await Deno.readTextFile(join(siteDir, "links.json")),
  );
  assertEquals(links.nav.length, 1);
  assertEquals(links.nav[0], {
    href: "/blog/index.html",
    label: "Home",
    topLevel: true,
  });

  const deps = pageDeps.get(pagePath);
  assertEquals(deps.templates.size, 3);
  assert(deps.svgs.has(join(siteDir, "src-svg", "ui", "check.svg")));
});
