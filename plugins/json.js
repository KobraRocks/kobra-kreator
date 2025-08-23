import { registerConverter } from "../lib/conversion-registry.js";

/**
 * Convert JSON content into a formatted HTML `<pre>` block.
 *
 * @param {string} _path Path to the JSON file (unused).
 * @param {string} content Raw JSON string.
 * @returns {string} HTML representation of the JSON data.
 */
export function jsonToHTML(_path, content = "") {
  const data = JSON.parse(content);
  const json = JSON.stringify(data, null, 2);
  const escaped = json.replace(/[&<>"']/g, (c) =>
    ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[c] || c
  );
  return `<pre>${escaped}</pre>`;
}

// Register converter for `.json` files.
registerConverter(".json", jsonToHTML);
