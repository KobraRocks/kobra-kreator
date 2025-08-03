import { renderPage } from "../lib/render-page.js";
import { join, toFileUrl } from "@std/path";

function assert(cond, msg = "Assertion failed") {
  if (!cond) throw new Error(msg);
}
function assertEquals(a, b) {
  const da = JSON.stringify(a);
  const db = JSON.stringify(b);
  if (da !== db) throw new Error(`Expected ${db}, got ${da}`);
}

Deno.test("renderPage supports prettyUrls", async () => {
  const root = await Deno.makeTempDir();
  const rootUrl = toFileUrl(root + "/");
  const siteDir = join(root, "mysite");
  const distDir = join(root, "dist");
  await Deno.mkdir(siteDir, { recursive: true });
  await Deno.mkdir(distDir, { recursive: true });

  await Deno.mkdir(join(root, "templates", "head"), { recursive: true });
  await Deno.mkdir(join(root, "templates", "nav"), { recursive: true });
  await Deno.mkdir(join(root, "templates", "footer"), { recursive: true });
  await Deno.writeTextFile(
    join(root, "templates", "head", "default.js"),
    "export function render() { return `<title></title>`; }",
  );
  await Deno.writeTextFile(
    join(root, "templates", "nav", "default.js"),
    "export function render() { return ``; }",
  );
  await Deno.writeTextFile(
    join(root, "templates", "footer", "default.js"),
    "export function render() { return ``; }",
  );

  await Deno.writeTextFile(
    join(siteDir, "config.json"),
    JSON.stringify({ distantDirectory: distDir, prettyUrls: true }),
  );

  const indexPath = join(siteDir, "index.html");
  const aboutPath = join(siteDir, "about.html");
  await Deno.writeTextFile(
    indexPath,
    `title = "Home"\n[templates]\nhead = "default"\nnav = "default"\nfooter = "default"\n[links.nav]\nlabel = "Home"\ntopLevel = true\n#---#\n<body></body>`,
  );
  await Deno.writeTextFile(
    aboutPath,
    `title = "About"\n[templates]\nhead = "default"\nnav = "default"\nfooter = "default"\n[links.nav]\nlabel = "About"\n#---#\n<body></body>`,
  );

  await renderPage(indexPath, rootUrl);
  await renderPage(aboutPath, rootUrl);

  const aboutOut = join(distDir, "about.html");
  await Deno.readTextFile(aboutOut);

  const links = JSON.parse(
    await Deno.readTextFile(join(siteDir, "links.json")),
  );
  assertEquals(links.nav[0], { href: "/", label: "Home", topLevel: true });
  assertEquals(links.nav[1], { href: "/about/", label: "About" });
});
