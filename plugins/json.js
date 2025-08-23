import { registerConverter } from "../lib/conversion-registry.js";

/**
 * Escape HTML special characters in a string.
 *
 * @param {string} text Input text to escape.
 * @returns {string} Escaped text safe for HTML.
 */
function escapeHtml(text) {
  return text.replace(/[&<>]/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
  })[ch]);
}

/**
 * Convert a JSON string into a formatted HTML block.
 *
 * @param {string} [json=""] JSON source to convert.
 * @returns {string} Generated HTML output.
 */
function jsonToHTML(json = "") {
  const data = JSON.parse(json || "null");
  const pretty = JSON.stringify(data, null, 2);
  return `<pre>${escapeHtml(pretty)}</pre>`;
}

registerConverter(".json", jsonToHTML);

export { jsonToHTML };
