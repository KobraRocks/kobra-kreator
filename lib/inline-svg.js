import { fromFileUrl } from "@std/path";
import { getEmoji } from "./emoji.js";

/**
 * Replace `<icon>` and `<logo>` elements with inline SVG content.
 *
 * @param {Document} doc DOM document to mutate.
 * @param {URL} [root] Base directory for locating the `src-svg/` folder.
 * @returns {Promise<string[]>} Paths of SVG files inlined into the document.
 */
export async function inlineSvg(doc, root = new URL("..", import.meta.url)) {
  const base = new URL("src-svg/", root);
  const nodes = doc.querySelectorAll("icon, logo");
  const used = [];
  for (const node of nodes) {
    const src = node.getAttribute("src");
    if (!src) continue;
    const fileUrl = new URL(src, base);
    let svg;
    try {
      svg = await Deno.readTextFile(fileUrl);
    } catch (err) {
      if (err instanceof Deno.errors.NotFound) {
        console.error(
          `${getEmoji("error")} Missing SVG: ${fileUrl.pathname}`,
        );
        continue;
      }
      throw err;
    }
    const filePath = fromFileUrl(fileUrl);
    let realPath;
    try {
      realPath = await Deno.realPath(filePath);
    } catch {
      realPath = filePath;
    }
    used.push(realPath);
    node.outerHTML = svg;
  }
  return used;
}
