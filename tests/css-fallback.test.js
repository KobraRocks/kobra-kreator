import { renderPage } from "../lib/render-page.js";
import { clearPageDeps } from "../lib/page-deps.js";
import { join, toFileUrl, fromFileUrl } from "@std/path";

function assert(cond, msg = "Assertion failed") {
  if (!cond) throw new Error(msg);
}
function assertEquals(a, b) {
  const da = JSON.stringify(a);
  const db = JSON.stringify(b);
  if (da !== db) throw new Error(`Expected ${db}, got ${da}`);
}
async function fileExists(path) {
  try {
    await Deno.stat(path);
    return true;
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) return false;
    throw err;
  }
}

Deno.test("renderPage falls back to core css when missing", async () => {
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
  await Deno.mkdir(join(root, "templates", "head"), { recursive: true });
  await Deno.mkdir(join(root, "templates", "nav"), { recursive: true });
  await Deno.mkdir(join(root, "templates", "footer"), { recursive: true });
  await Deno.writeTextFile(
    join(root, "templates", "head", "default.js"),
    [
      "export function render({ frontMatter }) {",
      '  const cssLinks = (frontMatter.css || []).map((href) => `<link rel=\\"stylesheet\\" href=\\"${href}\\">`).join(\"\");',
      "  return `<title>${frontMatter.title}</title>${cssLinks}`;",
      "}",
    ].join("\n"),
  );
  await Deno.writeTextFile(
    join(root, "templates", "nav", "default.js"),
    "export function render(){ return `<nav></nav>`; }",
  );
  await Deno.writeTextFile(
    join(root, "templates", "footer", "default.js"),
    "export function render(){ return `<footer></footer>`; }",
  );
  const pagePath = join(siteDir, "index.html");
  const page =
    'title = "Home"\ncss = ["styles.css"]\n[templates]\nhead = "default"\nnav = "default"\nfooter = "default"\n#---#\n<body>hi</body>';
  await Deno.writeTextFile(pagePath, page);
  await renderPage(pagePath, rootUrl);
  const cssOut = join(distDir, "styles.css");
  assert(await fileExists(cssOut));
  const outContent = await Deno.readTextFile(cssOut);
  const coreCss = fromFileUrl(new URL("../core/css/styles.css", import.meta.url));
  const coreContent = await Deno.readTextFile(coreCss);
  assertEquals(outContent, coreContent);
});
