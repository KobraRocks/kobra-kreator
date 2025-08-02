import { copyAsset } from "./copy-asset.js";
import { assert, assertEquals } from "jsr:@std/assert";
import { join, dirname } from "https://deno.land/std@0.224.0/path/mod.ts";

Deno.test("copyAsset preserves relative path", async () => {
  const root = await Deno.makeTempDir();
  const distant = join(root, "dist");
  await Deno.writeTextFile(join(root, "config.json"), JSON.stringify({ distantDirectory: distant }));
  const srcFile = join(root, "css", "style.css");
  await Deno.mkdir(dirname(srcFile), { recursive: true });
  await Deno.writeTextFile(srcFile, "body{}");
  await copyAsset(srcFile);
  const outFile = join(distant, "css", "style.css");
  const stat = await Deno.stat(outFile);
  assert(stat.isFile);
});

Deno.test("copyAsset skips non-whitelisted extensions", async () => {
  const root = await Deno.makeTempDir();
  const distant = join(root, "dist");
  await Deno.writeTextFile(join(root, "config.json"), JSON.stringify({ distantDirectory: distant }));
  const srcFile = join(root, "notes.txt");
  await Deno.writeTextFile(srcFile, "hello");
  await copyAsset(srcFile);
  const outFile = join(distant, "notes.txt");
  const exists = await fileExists(outFile);
  assertEquals(exists, false);
});

async function fileExists(path) {
  try {
    await Deno.stat(path);
    return true;
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) return false;
    throw err;
  }
}
