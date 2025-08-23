import { renderPage } from "../lib/render-page.js";
import { join, toFileUrl } from "@std/path";
import { assert, assertEquals } from "@std/assert";

/**
 * Check if a file exists on disk.
 * @param {string} path Path to the file.
 * @returns {Promise<boolean>} Whether the file exists.
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

Deno.test(
  "disabled pages skip rendering and are removed from links",
  async () => {
    const root = await Deno.makeTempDir();
    const rootUrl = toFileUrl(root + "/");
    const siteDir = join(root, "site");
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
      "export function render() { return `<title>t</title>`; }",
    );

    const pagePath = join(siteDir, "hello.html");
    const distPath = join(distDir, "hello.html");
    const initial =
      `title = "Home"\n[templates]\nhead = "default"\n[links.nav]\nlabel = "Home"\n#---#\n<body>hi</body>`;
    await Deno.writeTextFile(pagePath, initial);
    await renderPage(pagePath, rootUrl);
    let links = JSON.parse(
      await Deno.readTextFile(join(siteDir, "links.json")),
    );
    assertEquals(links.nav.length, 1);
    assert(await fileExists(distPath));

    const disabledPath = join(siteDir, "disabled.hello.html");
    await Deno.rename(pagePath, disabledPath);
    await renderPage(disabledPath, rootUrl);
    links = JSON.parse(await Deno.readTextFile(join(siteDir, "links.json")));
    assertEquals(links.nav.length, 0);
    assert(!(await fileExists(distPath)));
  },
);
