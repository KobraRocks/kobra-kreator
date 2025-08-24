import { diffSourceFiles, recordSourceFile, removeSourceFile, clearSourceFiles } from "./source-file-tracker.js";
import { assertEquals } from "@std/assert";
import { join } from "@std/path";

Deno.test("diffSourceFiles detects added, modified and removed files", async () => {
  clearSourceFiles();
  const root = await Deno.makeTempDir();
  const filePath = join(root, "index.html");
  await Deno.writeTextFile(filePath, "one");

  let diff = await diffSourceFiles(root);
  assertEquals(diff.added.length, 1);
  recordSourceFile(filePath, diff.added[0][1]);

  diff = await diffSourceFiles(root);
  assertEquals(diff.added.length, 0);
  assertEquals(diff.modified.length, 0);
  assertEquals(diff.removed.length, 0);

  await Deno.writeTextFile(filePath, "two");
  diff = await diffSourceFiles(root);
  assertEquals(diff.modified.length, 1);
  recordSourceFile(filePath, diff.modified[0][1]);

  await Deno.remove(filePath);
  diff = await diffSourceFiles(root);
  assertEquals(diff.removed, [filePath]);
  removeSourceFile(filePath);

  diff = await diffSourceFiles(root);
  assertEquals(diff.added.length, 0);
  assertEquals(diff.modified.length, 0);
  assertEquals(diff.removed.length, 0);
});
