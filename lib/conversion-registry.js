/**
 * Registry for file content converters based on extension.
 *
 * @typedef {(content: string, path: string) => string|Promise<string>} Converter
 */

/** @type {Map<string, Converter>} */
const converters = new Map();

/**
 * Register a converter for a specific file extension.
 * Passing a non-function removes the converter.
 *
 * @param {string} ext File extension beginning with a dot (e.g. ".md").
 * @param {Converter} [fn] Converter invoked for matching files.
 * @returns {void}
 */
export function registerConverter(ext, fn) {
  const key = ext.toLowerCase();
  if (typeof fn !== "function") {
    converters.delete(key);
    return;
  }
  converters.set(key, fn);
}

/**
 * Convert source content based on the file path's extension.
 *
 * @param {string} path Absolute or relative path to the source file.
 * @param {string} content Original file content.
 * @returns {Promise<string>} Converted content if a converter exists.
 */
export async function convert(path, content) {
  const idx = path.lastIndexOf(".");
  const ext = idx !== -1 ? path.slice(idx).toLowerCase() : "";
  const fn = converters.get(ext);
  if (!fn) return content;
  return await fn(content, path);
}

