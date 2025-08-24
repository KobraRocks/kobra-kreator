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

    /**
     * Maximum time in milliseconds to wait for the build to complete.
     * Can be overridden via the BUILD_TIMEOUT environment variable.
     * @type {number}
     */
    const buildTimeoutMs = Number(Deno.env.get("BUILD_TIMEOUT") ?? "30000");

    const build = fullBuild(1);
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("build timeout")), buildTimeoutMs)
    );
    await Promise.race([build, timeout]);

    try {
      await Deno.remove(dbPath);
    } catch (_) {
      // ignore if db was not created
    }
  },
});
