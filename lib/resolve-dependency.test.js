import { join } from "@std/path";
import { assertEquals } from "@std/assert";
import { resolveDependency } from "./resolve-dependency.js";

Deno.test("resolveDependency prioritizes shared then core", async () => {
  const siteDir = await Deno.makeTempDir({ dir: Deno.cwd() });
  const rel = "css/resolve-test.css";
  const sharedFile = join(Deno.cwd(), "shared", rel);
  const coreFile = join(Deno.cwd(), "core", rel);

  await Deno.mkdir(join(Deno.cwd(), "shared", "css"), { recursive: true });
  await Deno.writeTextFile(sharedFile, "/* shared */");

  let resolved = await resolveDependency(rel, siteDir);
  assertEquals(resolved, sharedFile);

  await Deno.remove(sharedFile);
  await Deno.writeTextFile(coreFile, "/* core */");

  resolved = await resolveDependency(rel, siteDir);
  assertEquals(resolved, coreFile);

  await Deno.remove(coreFile);
  await Deno.remove(join(Deno.cwd(), "shared"), { recursive: true });
  await Deno.remove(siteDir, { recursive: true });
});
