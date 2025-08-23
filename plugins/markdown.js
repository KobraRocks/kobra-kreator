import { marked } from "npm:marked@16";
import { registerConverter } from "../lib/conversion-registry.js";

/**
 * Convert Markdown formatted text into HTML using the `marked` library.
 *
 * @param {string} [markdown=""] Markdown source to convert.
 * @returns {string} Generated HTML output.
 */
function markdownToHTML(markdown = "") {
  return marked.parse(markdown, {
    headerIds: false,
    mangle: false,
  });
}

registerConverter(".md", markdownToHTML);

export { markdownToHTML };
