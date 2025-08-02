import { walk } from "@std/fs/walk";
import { renderPage } from "./render-page.js";

export async function renderAllPages() {
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
