import { parse } from "@std/flags";
import { walk } from "@std/fs/walk";
import { renderPage } from "./lib/render-page.js";
import { recordPageDeps } from "./lib/page-deps.js";
import { watch } from "./lib/watch.js";
import { getEmoji, logWithEmoji } from "./lib/emoji.js";

/**
 * Render all pages under the `/src` directory sequentially.
 * Optionally restrict rendering to pages under a specific hostname.
 *
 * @param {string} [hostname=""] Hostname folder to render (e.g. "example.com").
 * @returns {Promise<void>} Resolves when the initial build completes.
 */
export async function fullBuild(hostname = "") {
  const root = new URL("./src", import.meta.url);
  const target = hostname ? new URL(`./${hostname}`, root) : root;
  try {
    for await (
      const entry of walk(target, { includeDirs: false, exts: [".html", ".md"] })
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
  /**
   * CLI flags accepted by the build script.
   *
   * @type {{ hostname: string | undefined }}
   */
  const flags = parse(Deno.args, {
    string: ["hostname"],
    alias: { h: "hostname" },
    default: { hostname: "" },
  });

  const hostname = flags.hostname || "";
  await fullBuild(hostname);
  await watch(hostname);
}
