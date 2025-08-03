import { renderPage } from "../lib/render-page.js";
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

Deno.test("renderPage converts markdown sources", async () => {
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

  await Deno.mkdir(join(root, "templates", "head"), { recursive: true });
  await Deno.writeTextFile(
    join(root, "templates", "head", "default.js"),
    "export function render({ frontMatter }) { return `<title>${frontMatter.title}</title>`; }",
  );

  const pagePath = join(siteDir, "index.md");
  const md =
    `title = "Title"\n[templates]\nhead = "default"\n#---#\n# Hello\nThis is *markdown*.`;
  await Deno.writeTextFile(pagePath, md);

  await renderPage(pagePath, rootUrl);

  const outPath = join(distDir, "index.html");
  const html = await Deno.readTextFile(outPath);
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  assert(doc);
  assert(doc.querySelector("h1")?.textContent === "Hello");
  assert(doc.querySelector("p em")?.textContent === "markdown");
});
