/**
 * Registry for file content converters.
 *
 * Each converter transforms a file's raw text into HTML based on its
 * extension. Converters register themselves by file extension and are looked up
 * at runtime by {@link convert}.
 */
const converters = new Map();

/**
 * Register a converter function for a given file extension.
 *
 * @param {string} ext File extension including the leading dot (e.g., ".md").
 * @param {(path: string, content: string) => string} fn Converter function
 * that returns HTML.
 */
export function registerConverter(ext, fn) {
  converters.set(ext.toLowerCase(), fn);
}

/**
 * Convert source content based on the file's extension.
 *
 * @param {string} path Absolute path to the source file.
 * @param {string} content Raw file content.
 * @returns {string} Converted HTML or original content if no converter exists.
 */
export function convert(path, content) {
  const idx = path.lastIndexOf(".");
  const ext = idx >= 0 ? path.slice(idx).toLowerCase() : "";
  const fn = converters.get(ext);
  return fn ? fn(path, content) : content;
}
