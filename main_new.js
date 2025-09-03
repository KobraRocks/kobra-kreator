import { parse } from "@std/flags";
import { walk } from "@std/fs/walk";
import { renderPage } from "./lib/render-page.js";
import { recordPageDeps } from "./lib/page-deps.js";
import { watch } from "./lib/watch.js";
import { getEmoji, logWithEmoji } from "./lib/emoji.js";

/**
 * Render all pages under the `/src` directory sequentially.
 *
 * @returns {Promise<void>} Resolves when the initial build completes.
 */
export async function fullBuild() {
  const root = new URL("./src", import.meta.url);
  try {
    for await (
      const entry of walk(root, { includeDirs: false, exts: [".html", ".md"] })
    ) {
      const deps = await renderPage(entry.path);
      if (deps) recordPageDeps(deps);
    }
    logWithEmoji("system", `${getEmoji("success")} BUILD -- done!`);
  } catch (err) {
    if (!(err instanceof Deno.errors.NotFound)) throw err;
    logWithEmoji("system", `${getEmoji("error")} BUILD -- failed: ${err}`);
  }
}

// #######################
// CLI
// #######################

if (import.meta.main) {
  // parse flags for parity with previous CLI even though no worker option exists
  parse(Deno.args);
  await fullBuild();
  await watch();
}
