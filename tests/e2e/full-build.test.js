/**
 * @fileoverview Ensure full site build resolves without hanging.
 */
import { fullBuild } from "../../main.js";
import { fromFileUrl } from "@std/path";

// Disable sanitizers due to worker usage during build.
Deno.test({
  name: "full build completes",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    const dbPath = fromFileUrl(new URL("../../kobra.db", import.meta.url));
    try {
      await Deno.remove(dbPath);
    } catch (_) {
      // ignore if db does not exist
    }

    const build = fullBuild(1);
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("build timeout")), 10000)
    );
    await Promise.race([build, timeout]);

    try {
      await Deno.remove(dbPath);
    } catch (_) {
      // ignore if db was not created
    }
  },
});
