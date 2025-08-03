/**
 * Replace <icon> and <logo> elements with inline SVG content.
 *
 * @param {Document} doc - DOM document to mutate.
 * @param {URL} [root] - Base directory for locating src-svg/ folder.
 */
import { fromFileUrl } from "@std/path";
import { getEmoji } from "./emoji.js";

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
    used.push(fromFileUrl(fileUrl));
    node.outerHTML = svg;
  }
  return used;
}
