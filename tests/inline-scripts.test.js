import { renderPage } from "../lib/render-page.js";
import { copyAsset } from "../lib/copy-asset.js";
import { join, toFileUrl } from "@std/path";
import { DOMParser } from "@b-fuze/deno-dom";

/**
 * Simple assertion helper.
 * @param {unknown} cond Condition expected to be truthy.
 * @param {string} [msg] Optional assertion message.
 */
function assert(cond, msg = "Assertion failed") {
  if (!cond) throw new Error(msg);
}

/**
 * Check whether a file exists on disk.
 * @param {string} path Path to test.
 * @returns {Promise<boolean>} True if the file exists.
 */
async function exists(path) {
  try {
    await Deno.stat(path);
    return true;
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) return false;
    throw err;
  }
}

Deno.test("inline scripts are inlined and not copied", async () => {
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
  const inlineFile = "test.inline.js";
  await Deno.writeTextFile(
    join(siteDir, inlineFile),
    "console.log('inline');",
  );

  await Deno.mkdir(join(root, "templates", "head"), { recursive: true });
  await Deno.writeTextFile(
    join(root, "templates", "head", "default.js"),
    "export function render() { return `<title>Inline</title>`; }",
  );

  const pagePath = join(siteDir, "index.html");
  const page =
    `title = "Inline"\n[scripts]\ninline = ["${inlineFile}"]\n[templates]\nhead = "default"\n#---#\n<body></body>`;
  await Deno.writeTextFile(pagePath, page);

  // Attempt to copy the inline script; this should be skipped.
  await copyAsset(join(siteDir, inlineFile));

  await renderPage(pagePath, rootUrl);

  const distInline = join(distDir, inlineFile);
  assert(!(await exists(distInline)), "inline script should not be copied");

  const outHtml = await Deno.readTextFile(join(distDir, "index.html"));
  const parser = new DOMParser();
  const doc = parser.parseFromString(outHtml, "text/html");
  assert(doc);
  const inlineScript = Array.from(doc.querySelectorAll("script")).find(
    (s) => !s.getAttribute("src"),
  );
  assert(inlineScript?.textContent.includes("console.log"));
});
