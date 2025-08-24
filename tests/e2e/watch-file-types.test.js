/**
 * @fileoverview E2E test verifying asset file type handling.
 */
import { renderPage } from "../../lib/render-page.js";
import {
  clearPageDeps,
  pagesUsingCss,
  pagesUsingModule,
  recordPageDeps,
} from "../../lib/page-deps.js";
import { classifyPath, reduceEvents } from "../../lib/fs-utils.js";
import { copyAsset } from "../../lib/copy-asset.js";
import { hashAssetName } from "../../lib/hash-asset.js";
import { join, toFileUrl } from "@std/path";

/**
 * Basic assertion helper.
 * @param {unknown} cond Condition expected to be truthy.
 * @param {string} [msg] Optional assertion message.
 */
function assert(cond, msg = "Assertion failed") {
  if (!cond) throw new Error(msg);
}

/**
 * Check whether a file exists on disk.
 * @param {string} path Path to the file to check.
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

// Disable sanitizers because file operations can leave handles briefly open.
Deno.test({
  name: "watch processes only whitelisted asset file types",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    clearPageDeps();
    const root = await Deno.makeTempDir();
    const rootUrl = toFileUrl(root + "/");
    const siteDir = join(root, "src", "mysite");
    const distDir = join(root, "dist");
    await Deno.mkdir(siteDir, { recursive: true });
    await Deno.mkdir(distDir, { recursive: true });
    await Deno.writeTextFile(
      join(siteDir, "config.json"),
      JSON.stringify({ distantDirectory: distDir, hashAssets: true }),
    );

    await Deno.mkdir(join(root, "templates", "head"), { recursive: true });
    await Deno.writeTextFile(
      join(root, "templates", "head", "default.js"),
      [
        "export function render({ frontMatter }) {",
        '  const cssLinks = (frontMatter.css || []).map((href) => `<link rel=\\"stylesheet\\" href=\\"${href}\\">`).join(\'\');',
        "  return `<title>${frontMatter.title}</title>${cssLinks}`;",
        "}",
      ].join("\n"),
    );

    const cssPath = join(siteDir, "styles.css");
    await Deno.writeTextFile(cssPath, "body{color:red;}");
    const jsDir = join(siteDir, "js");
    await Deno.mkdir(jsDir, { recursive: true });
    const jsPath = join(jsDir, "app.js");
    await Deno.writeTextFile(jsPath, "console.log('one');");
    const badPath = join(siteDir, "notes.txt");
    await Deno.writeTextFile(badPath, "ignore");

    const pagePath = join(siteDir, "index.html");
    const page = [
      'title = "Watch"',
      'css = ["styles.css"]',
      "[scripts]",
      'modules = ["/js/app.js"]',
      "[templates]",
      'head = "default"',
      "#---#",
      "<body></body>",
    ].join("\n");
    await Deno.writeTextFile(pagePath, page);

    const deps = await renderPage(pagePath, rootUrl);
    if (deps) recordPageDeps(deps);

    const cssHash1 = await hashAssetName(cssPath);
    const jsHash1 = await hashAssetName(jsPath);

    await copyAsset(cssPath);
    await copyAsset(jsPath);

    let html = await Deno.readTextFile(join(distDir, "index.html"));
    assert(html.includes(cssHash1));
    assert(html.includes(jsHash1));

    await Deno.writeTextFile(cssPath, "body{color:blue;}");
    await Deno.writeTextFile(jsPath, "console.log('two');");
    await Deno.writeTextFile(badPath, "changed");

    const events = [
      { kind: "modify", paths: [cssPath] },
      { kind: "modify", paths: [jsPath] },
      { kind: "modify", paths: [badPath] },
    ];
    const paths = reduceEvents(events);
    const renderTasks = [];
    for (const [p, evtKind] of paths) {
      const type = classifyPath(p);
      if ((evtKind === "create" || evtKind === "modify") && type === "ASSET") {
        await copyAsset(p);
        const ext = p.slice(p.lastIndexOf(".")).toLowerCase();
        if (ext === ".css") {
          for (const page of pagesUsingCss(p)) {
            renderTasks.push(page);
          }
        } else if (ext === ".js" && !p.endsWith(".inline.js")) {
          for (const page of pagesUsingModule(p)) {
            renderTasks.push(page);
          }
        }
      }
    }
    for (const page of renderTasks) {
      const d = await renderPage(page);
      if (d) recordPageDeps(d);
    }

    const cssHash2 = await hashAssetName(cssPath);
    const jsHash2 = await hashAssetName(jsPath);

    html = await Deno.readTextFile(join(distDir, "index.html"));
    assert(html.includes(cssHash2));
    assert(html.includes(jsHash2));
    assert(!html.includes(cssHash1));
    assert(!html.includes(jsHash1));

    const cssOutOld = join(distDir, cssHash1);
    const jsOutOld = join(distDir, "js", jsHash1);
    const cssOutNew = join(distDir, cssHash2);
    const jsOutNew = join(distDir, "js", jsHash2);
    assert(!(await fileExists(cssOutOld)));
    assert(!(await fileExists(jsOutOld)));
    assert(await fileExists(cssOutNew));
    assert(await fileExists(jsOutNew));

    const badOut = join(distDir, "notes.txt");
    assert(!(await fileExists(badOut)));

    await Deno.remove(root, { recursive: true });
  },
});
