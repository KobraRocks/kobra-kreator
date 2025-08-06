import { marked } from "npm:marked@16";

/**
 * Convert Markdown formatted text into HTML using the `marked` library.
 *
 * @param {string} [markdown=""] Markdown source to convert.
 * @returns {string} Generated HTML output.
 */
export function markdownToHTML(markdown = "") {
  return marked.parse(markdown, {
    headerIds: false,
    mangle: false,
  });
}
