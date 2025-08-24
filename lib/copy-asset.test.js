import { copyAsset, removeAsset } from "./copy-asset.js";
import { hashAssetName } from "./hash-asset.js";
import { assert, assertEquals } from "@std/assert";
import { dirname, join } from "@std/path";
import { Database } from "@db/sqlite";

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

Deno.test("hashAssets adds content hash to filenames", async () => {
  const root = await Deno.makeTempDir();
  const distant = join(root, "dist");
  await Deno.writeTextFile(
    join(root, "config.json"),
    JSON.stringify({ distantDirectory: distant, hashAssets: true }),
  );
  const srcFile = join(root, "css", "style.css");
  await Deno.mkdir(dirname(srcFile), { recursive: true });
  await Deno.writeTextFile(srcFile, "body{}");
  await copyAsset(srcFile);
  const hashed = await hashAssetName(srcFile);
  const outFile = join(distant, "css", hashed);
  const stat = await Deno.stat(outFile);
  assert(stat.isFile);
});

Deno.test("removeAsset deletes hashed files", async () => {
  const root = await Deno.makeTempDir();
  const distant = join(root, "dist");
  await Deno.writeTextFile(
    join(root, "config.json"),
    JSON.stringify({ distantDirectory: distant, hashAssets: true }),
  );
  const srcFile = join(root, "js", "app.js");
  await Deno.mkdir(dirname(srcFile), { recursive: true });
  await Deno.writeTextFile(srcFile, "console.log('hi')");
  await copyAsset(srcFile);
  const hashed = await hashAssetName(srcFile);
  const outFile = join(distant, "js", hashed);
  await removeAsset(srcFile);
  const exists = await fileExists(outFile);
  assertEquals(exists, false);
});

Deno.test(
  "hashAssets removes un-hashed files when copying and removing",
  async () => {
    const root = await Deno.makeTempDir();
    const distant = join(root, "dist");
    await Deno.writeTextFile(
      join(root, "config.json"),
      JSON.stringify({ distantDirectory: distant, hashAssets: true }),
    );
    const srcFile = join(root, "css", "style.css");
    await Deno.mkdir(dirname(srcFile), { recursive: true });
    await Deno.writeTextFile(srcFile, "body{}");
    const outFile = join(distant, "css", "style.css");
    await Deno.mkdir(dirname(outFile), { recursive: true });
    await Deno.writeTextFile(outFile, "stale");
    await copyAsset(srcFile);
    const hashed = await hashAssetName(srcFile);
    const hashedOut = join(distant, "css", hashed);
    let exists = await fileExists(outFile);
    assertEquals(exists, false);
    exists = await fileExists(hashedOut);
    assertEquals(exists, true);
    await Deno.writeTextFile(outFile, "stale");
    await removeAsset(srcFile);
    exists = await fileExists(outFile);
    assertEquals(exists, false);
    exists = await fileExists(hashedOut);
    assertEquals(exists, false);
  },
);

Deno.test("copyAsset records and removeAsset cleans sqlite", async () => {
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
  const db = new Database(join(Deno.cwd(), "kobra.db"));
  let stmt = db.prepare("SELECT path FROM tracked_files WHERE path = ?");
  let rows = stmt.all([outFile]);
  assertEquals(rows.length, 1);
  stmt.finalize();
  await removeAsset(srcFile);
  stmt = db.prepare("SELECT path FROM tracked_files WHERE path = ?");
  rows = stmt.all([outFile]);
  assertEquals(rows.length, 0);
  stmt.finalize();
  db.close();
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
