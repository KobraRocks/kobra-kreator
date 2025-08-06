import { join } from "@std/path";
import { assertEquals, assertRejects } from "https://deno.land/std@0.203.0/testing/asserts.ts";
import { findSiteRoot } from "./load-config.js";

Deno.test("findSiteRoot - locates nearest config.json", async () => {
  const dir = await Deno.makeTempDir();
  try {
    await Deno.writeTextFile(join(dir, "config.json"), "{}\n");
    const nested = join(dir, "a", "b");
    await Deno.mkdir(nested, { recursive: true });
    const filePath = join(nested, "file.txt");
    const root = await findSiteRoot(filePath);
    assertEquals(root, dir);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("findSiteRoot - errors when config.json missing", async () => {
  const dir = await Deno.makeTempDir();
  try {
    const nested = join(dir, "child");
    await Deno.mkdir(nested);
    const filePath = join(nested, "file.txt");
    await assertRejects(() => findSiteRoot(filePath));
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
