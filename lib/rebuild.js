import { walk } from "https://deno.land/std@0.224.0/fs/walk.ts";
import { renderPage } from "./render-page.js";

async function renderAllPages() {
  const root = new URL("../src", import.meta.url);
  try {
    for await (
      const entry of walk(root, { exts: [".html"], includeDirs: false })
    ) {
      await renderPage(entry.path);
    }
  } catch (err) {
    if (!(err instanceof Deno.errors.NotFound)) throw err;
  }
}

export async function renderAllUsingTemplate(_path) {
  await renderAllPages();
}

export async function renderAllUsingSvg(_path) {
  await renderAllPages();
}
