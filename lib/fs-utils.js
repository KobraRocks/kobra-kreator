import { MEDIA_EXTENSIONS, SRC_ASSET_EXTENSIONS } from "./extension-whitelist.js";

/**
 * @typedef {Deno.FsEvent['kind']} FsEventKind
 */

/**
 * @typedef {"PAGE_HTML"|"TEMPLATE"|"SVG_INLINE"|"JS_INLINE"|"ASSET"|null} PathClassification
 */

/**
 * Collapse multiple filesystem events into the most relevant ones.
 *
 * @param {Deno.FsEvent[]} events Events to reduce.
 * @returns {Map<string, FsEventKind>} Map of paths to final event kinds.
 */
export function reduceEvents(events) {
  const result = new Map();

  for (const event of events) {
    for (const path of event.paths) {
      const prev = result.get(path);
      const next = event.kind;

      if (!prev) {
        result.set(path, next);
      } else if (prev === next) {
        continue;
      } else if (prev === "create" && next === "modify") {
        continue; // treat as "create"
      } else {
        result.set(path, next); // override with latest meaningful change
      }
    }
  }

  return result;
}

/**
 * Classify a filesystem path to determine how it should be handled.
 *
 * @param {string} path Path to classify.
 * @returns {PathClassification} Classification result.
 */
export function classifyPath(path) {
  const normalized = path.replace(/\\/g, "/").toLowerCase();

  if (normalized.endsWith(".html") || normalized.endsWith(".md")) return "PAGE_HTML";
  if (normalized.includes("/templates/") && normalized.endsWith(".js")) return "TEMPLATE";
  if (normalized.includes("/src-svg/") && normalized.endsWith(".svg")) return "SVG_INLINE";
  if (normalized.endsWith(".inline.js")) return "JS_INLINE";

  if (normalized.includes("/media/")) {
    const ext = normalized.slice(normalized.lastIndexOf("."));
    if (MEDIA_EXTENSIONS.has(ext)) return "ASSET";
  }

  if (normalized.includes("/src/")) {
    const ext = normalized.slice(normalized.lastIndexOf("."));
    if (SRC_ASSET_EXTENSIONS.has(ext)) return "ASSET";
  }

  return null;
}

