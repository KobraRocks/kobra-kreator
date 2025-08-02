import { fromFileUrl } from "https://deno.land/std@0.224.0/path/mod.ts";
import { renderPage } from "./render-page.js";
import { renderAllUsingSvg, renderAllUsingTemplate } from "./rebuild.js";
import { copyAsset } from "./copy-asset.js";


const MEDIA_EXTS = new Set([
  ".svg",
  ".mp4",
  ".jpg",
  ".png",
  ".webm",
  ".webp",
  ".pdf",
  ".ttf",
  ".otf",
]);

const SRC_ASSET_EXTS = new Set([
  ".css",
  ".js",
  ".svg",
  ".mp4",
  ".jpg",
  ".png",
  ".webm",
  ".webp",
  ".pdf",
  ".ttf",
  ".otf",
]);

export async function watch() {
  const src = fromFileUrl(new URL("../src", import.meta.url));
  const templates = fromFileUrl(new URL("../templates", import.meta.url));

  const watchers = [
    Deno.watchFs(src, { recursive: true }),
    Deno.watchFs(templates, { recursive: true }),
  ];

  const queue = [];
  let timer;

  async function flush() {
    const events = queue.splice(0);
    timer = undefined;
    const paths = reduceEvents(events);
    const tasks = new Map();
    for (const [path] of paths) {
      const kind = classifyPath(path);
      if (kind === "PAGE_HTML") {
        tasks.set(`page:${path}`, () => renderPage(path));
      } else if (kind === "TEMPLATE") {
        tasks.set(`tpl:${path}`, () => renderAllUsingTemplate(path));
      } else if (kind === "SVG_INLINE") {
        tasks.set(`svg:${path}`, () => renderAllUsingSvg(path));
      } else if (kind === "ASSET") {
        tasks.set(`asset:${path}`, () => copyAsset(path));
      }
    }
    await Promise.all([...tasks.values()].map((fn) => fn()));
  }

  async function handle(w) {
    for await (const evt of w) {
      queue.push(evt);
      if (!timer) timer = setTimeout(flush, 50);
    }
  }

  await Promise.all(watchers.map(handle));
}

export function reduceEvents(events) {
  const map = new Map();
  for (const evt of events) {
    for (const path of evt.paths) {
      const prev = map.get(path);
      if (!prev) {
        map.set(path, evt.kind);
      } else if (prev === evt.kind) {
        continue;
      } else if (prev === "create" && evt.kind === "modify") {
        continue;
      } else {
        map.set(path, evt.kind);
      }
    }
  }
  return map;
}

export function classifyPath(path) {
  const p = path.replace(/\\/g, "/");
  const lower = p.toLowerCase();
  if (lower.endsWith(".html")) return "PAGE_HTML";
  if (lower.includes("/templates/") && lower.endsWith(".js")) return "TEMPLATE";
  if (lower.includes("/src-svg/") && lower.endsWith(".svg")) {
    return "SVG_INLINE";
  }
  if (lower.includes("/media/")) {
    const ext = lower.slice(lower.lastIndexOf("."));

    if (MEDIA_EXTS.has(ext)) return "ASSET";
  }
  if (lower.includes("/src/")) {
    const ext = lower.slice(lower.lastIndexOf("."));
    if (SRC_ASSET_EXTS.has(ext)) return "ASSET";

  }
  return null;
}
