import { removePage } from "./render-page.js";
import { trackFile } from "./file-tracker.js";
import { assertEquals } from "@std/assert";
import { join } from "@std/path";
import { Database } from "@db/sqlite";

Deno.test("removePage deletes rendered file", async () => {
  const root = await Deno.makeTempDir();
  const distant = join(root, "dist");
  await Deno.writeTextFile(
    join(root, "config.json"),
    JSON.stringify({ distantDirectory: distant }),
  );
  const srcFile = join(root, "index.html");
  await Deno.writeTextFile(srcFile, "<h1>Test</h1>");
  const outFile = join(distant, "index.html");
  await Deno.mkdir(distant, { recursive: true });
  await Deno.writeTextFile(outFile, "content");
  trackFile(root, outFile);
  await removePage(srcFile);
  const exists = await fileExists(outFile);
  assertEquals(exists, false);
  const db = new Database(join(Deno.cwd(), "kobra.db"));
  const stmt = db.prepare("SELECT path FROM tracked_files WHERE path = ?");
  const rows = stmt.all([outFile]);
  assertEquals(rows.length, 0);
  stmt.finalize();
  db.close();
});

Deno.test("removePage deletes rendered file when prettyUrls enabled", async () => {
  const root = await Deno.makeTempDir();
  const distant = join(root, "dist");
  await Deno.writeTextFile(
    join(root, "config.json"),
    JSON.stringify({ distantDirectory: distant, prettyUrls: true }),
  );
  const srcFile = join(root, "hello.html");
  const outFile = join(distant, "hello.html");
  await Deno.mkdir(distant, { recursive: true });
  await Deno.writeTextFile(outFile, "content");
  await removePage(srcFile);
  const exists = await fileExists(outFile);
  assertEquals(exists, false);
});

/**
 * Determine if a file exists at the specified path.
 *
 * @param {string} path Path to the file to check.
 * @returns {Promise<boolean>} Whether the file exists.
 */
async function fileExists(path) {
  try {
    await Deno.stat(path);
    return true;
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) return false;
    throw err;
  }
}
