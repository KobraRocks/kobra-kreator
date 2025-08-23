/**
 * Registry for custom front-matter handlers.
 *
 * @typedef {object} FrontMatterContext
 * @property {import('./parse-page.js').ParsedPage} page Parsed page object being processed.
 * @property {string} siteDir Site root directory.
 */

/** @type {Map<string, (value: unknown, context: FrontMatterContext) => unknown>} */
const handlers = new Map();

/**
 * Register a handler for a front-matter key. Passing a non-function removes the handler.
 *
 * @param {string} key The front-matter key to handle.
 * @param {(value: unknown, context: FrontMatterContext) => unknown|Promise<unknown>} [fn] Handler invoked for the key.
 * @returns {void}
 */
export function registerFrontMatterHandler(key, fn) {
  if (typeof fn !== 'function') {
    handlers.delete(key);
    return;
  }
  handlers.set(key, fn);
}

/**
 * Determine whether a handler exists for the given key.
 *
 * @param {string} key Front-matter key to check.
 * @returns {boolean} True if a handler has been registered.
 */
export function hasFrontMatterHandler(key) {
  return handlers.has(key);
}

/**
 * Run all registered handlers for the provided front-matter data.
 *
 * @param {Record<string, unknown>} frontMatter Unvalidated front-matter entries.
 * @param {FrontMatterContext} context Processing context passed to handlers.
 * @returns {Promise<void>} Resolves when all handlers complete.
 */
export async function runFrontMatterHandlers(frontMatter, context) {
  for (const [key, value] of Object.entries(frontMatter)) {
    const handler = handlers.get(key);
    if (handler) {
      await handler(value, context);
    }
  }
}

/**
 * Apply any registered front-matter handlers to a parsed page.
 *
 * @param {import('./parse-page.js').ParsedPage} page Page whose unvalidated keys should be processed.
 * @param {string} siteDir Site root directory.
 * @returns {Promise<void>} Resolves when all handlers have run.
 */
export async function applyFrontMatterHandlers(page, siteDir) {
  const extra = page.unvalidatedFrontMatter;
  if (!extra || Object.keys(extra).length === 0) return;
  await runFrontMatterHandlers(extra, { page, siteDir });
}

