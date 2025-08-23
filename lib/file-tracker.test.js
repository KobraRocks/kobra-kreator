import { trackFile, untrackFile, getTrackedFiles } from "./file-tracker.js";
import { assertEquals } from "@std/assert";
import { join } from "@std/path";

Deno.test("trackFile and untrackFile manage sqlite and filesystem", async () => {
  const root = await Deno.makeTempDir();
  const siteDir = root;
  const dist = join(root, "dist");
  await Deno.mkdir(dist, { recursive: true });
  const filePath = join(dist, "note.txt");
  await Deno.writeTextFile(filePath, "hi");
  trackFile(siteDir, filePath);
  let tracked = getTrackedFiles(siteDir);
  assertEquals(tracked.includes(filePath), true);
  await untrackFile(siteDir, filePath);
  tracked = getTrackedFiles(siteDir);
  assertEquals(tracked.includes(filePath), false);
  try {
    await Deno.stat(filePath);
    throw new Error("file still exists");
  } catch (err) {
    if (!(err instanceof Deno.errors.NotFound)) throw err;
  }
});
