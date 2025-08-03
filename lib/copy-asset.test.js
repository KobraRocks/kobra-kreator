import { copyAsset, removeAsset } from "./copy-asset.js";
import { assert, assertEquals } from "@std/assert";
import { dirname, join } from "@std/path";

Deno.test("copyAsset preserves relative path", async () => {
  const root = await Deno.makeTempDir();
  const distant = join(root, "dist");
  await Deno.writeTextFile(
    join(root, "config.json"),
    JSON.stringify({ distantDirectory: distant }),
  );
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
  await Deno.writeTextFile(
    join(root, "config.json"),
    JSON.stringify({ distantDirectory: distant }),
  );
  const srcFile = join(root, "notes.txt");
  await Deno.writeTextFile(srcFile, "hello");
  await copyAsset(srcFile);
  const outFile = join(distant, "notes.txt");
  const exists = await fileExists(outFile);
  assertEquals(exists, false);
});

Deno.test("removeAsset deletes destination file", async () => {
  const root = await Deno.makeTempDir();
  const distant = join(root, "dist");
  await Deno.writeTextFile(
    join(root, "config.json"),
    JSON.stringify({ distantDirectory: distant }),
  );
  const srcFile = join(root, "js", "app.js");
  await Deno.mkdir(dirname(srcFile), { recursive: true });
  await Deno.writeTextFile(srcFile, "console.log('hi')");
  await copyAsset(srcFile);
  const outFile = join(distant, "js", "app.js");
  await removeAsset(srcFile);
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
