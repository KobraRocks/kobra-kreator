import { clearPageDeps, pagesUsingSvg, recordPageDeps } from "./page-deps.js";
import { join } from "@std/path";
import { assertEquals } from "@std/assert";

Deno.test("pagesUsingSvg resolves real paths", async () => {
  clearPageDeps();
  const root = await Deno.makeTempDir();
  const svgDir = join(root, "src-svg");
  await Deno.mkdir(svgDir, { recursive: true });
  const svgPath = join(svgDir, "icon.svg");
  await Deno.writeTextFile(svgPath, "<svg></svg>");
  recordPageDeps(join(root, "index.html"), [], [svgPath]);
  const nonCanonical = join(svgDir, "..", "src-svg", "icon.svg");
  assertEquals(pagesUsingSvg(nonCanonical), [join(root, "index.html")]);
});
