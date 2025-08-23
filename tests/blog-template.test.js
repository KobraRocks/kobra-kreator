/**
 * @fileoverview Ensures blog pages use the blog content template while other
 * templates like head, nav and footer are still rendered via front matter.
 */
import { renderPage } from "../lib/render-page.js";
import { join, toFileUrl } from "@std/path";
import { DOMParser } from "@b-fuze/deno-dom";

/**
 * Assert that a condition is truthy.
 * @param {unknown} cond Condition to evaluate.
 * @param {string} [msg] Optional error message.
 */
function assert(cond, msg = "Assertion failed") {
  if (!cond) throw new Error(msg);
}
/**
 * Assert that two values are deeply equal.
 * @param {unknown} a First value.
 * @param {unknown} b Second value.
 */
function assertEquals(a, b) {
  const da = JSON.stringify(a);
  const db = JSON.stringify(b);
  if (da !== db) throw new Error(`Expected ${db}, got ${da}`);
}

Deno.test("blog pages render with blog template and other templates", async () => {
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

  // Shared templates for head, nav, and footer
  await Deno.mkdir(join(root, "templates", "head"), { recursive: true });
  await Deno.writeTextFile(
    join(root, "templates", "head", "default.js"),
    "export function render({ frontMatter }) { return `<title>${frontMatter.title}</title>`; }",
  );

  await Deno.mkdir(join(root, "templates", "nav"), { recursive: true });
  await Deno.writeTextFile(
    join(root, "templates", "nav", "default.js"),
    "export function render() { return `<nav>Nav</nav>`; }",
  );

  await Deno.mkdir(join(root, "templates", "footer"), { recursive: true });
  await Deno.writeTextFile(
    join(root, "templates", "footer", "default.js"),
    "export function render() { return `<footer>Footer</footer>`; }",
  );

  // Blog markdown page with headings to generate a table of contents
  const pagePath = join(siteDir, "blog", "post.md");
  await Deno.mkdir(join(siteDir, "blog"), { recursive: true });
  const md =
    `title = "Blog Post"\n[templates]\nhead = "default"\nnav = "default"\nfooter = "default"\n#---#\n## Section 1\nContent`;
  await Deno.writeTextFile(pagePath, md);

  await renderPage(pagePath, rootUrl);

  const outPath = join(distDir, "blog", "post.html");
  const html = await Deno.readTextFile(outPath);
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  assert(doc);
  assertEquals(doc.querySelector("title")?.textContent, "Blog Post");
  assertEquals(doc.querySelector("nav")?.textContent, "Nav");
  assertEquals(doc.querySelector("footer")?.textContent, "Footer");
  const link = doc.querySelector("main ul li a");
  assert(link && link.getAttribute("href") === "#section-1");
  assert(doc.querySelector("main h2")?.getAttribute("id") === "section-1");
});
