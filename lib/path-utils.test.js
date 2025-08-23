/**
 * Tests for path utility helpers ensuring URL and output paths are generated
 * correctly.
 */
import { toHref } from "./manage-links.js";
import { toOutRel } from "./write-output.js";
import { assertEquals } from "@std/assert";

Deno.test("toHref respects pretty option", () => {
  assertEquals(toHref("about.html", false), "/about.html");
  assertEquals(toHref("blog/index.html", true), "/blog");
  assertEquals(toHref("blog/post.html", true), "/blog/post");
});

Deno.test("toOutRel builds correct output paths", () => {
  assertEquals(toOutRel("about.md", false), "about.html");
  assertEquals(toOutRel("blog/post.md", true), "blog/post.html");
  assertEquals(toOutRel("data.json", false), "data.html");
});
