/**
 * @fileoverview Tests RSS feed generation from blog posts.
 */
import { generateFeed } from "../lib/generate-feed.js";
import { join } from "@std/path";

/**
 * Assert that a condition is truthy.
 * @param {unknown} cond Condition to evaluate.
 * @param {string} [msg] Optional error message.
 */
function assert(cond, msg = "Assertion failed") {
  if (!cond) throw new Error(msg);
}

Deno.test("generateFeed creates feed.xml from blog posts", async () => {
  const root = await Deno.makeTempDir();
  const siteDir = join(root, "mysite");
  const distDir = join(root, "dist");
  await Deno.mkdir(join(siteDir, "blog"), { recursive: true });

  const config = {
    distantDirectory: distDir,
    siteUrl: "https://example.com",
    title: "My Blog",
  };

  const postA =
    `title = "First"\ndate = "2024-01-01"\n[templates]\nhead = "default"\n#---#\nA`;
  await Deno.writeTextFile(join(siteDir, "blog", "a.md"), postA);
  const postB =
    `title = "Second"\ndate = "2024-02-01"\n[templates]\nhead = "default"\n#---#\nB`;
  await Deno.writeTextFile(join(siteDir, "blog", "b.md"), postB);

  await generateFeed(siteDir, config);

  const feedPath = join(distDir, "blog", "feed.xml");
  const xml = await Deno.readTextFile(feedPath);
  assert(xml.includes("<title>My Blog</title>"));
  const first = xml.indexOf("<title>Second</title>");
  const second = xml.indexOf("<title>First</title>");
  assert(first > -1 && second > -1 && first < second);
});
