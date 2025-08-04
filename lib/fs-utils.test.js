import { assertEquals } from "https://deno.land/std@0.203.0/testing/asserts.ts";
import { reduceEvents, classifyPath } from "./fs-utils.js";

Deno.test("reduceEvents - collapses redundant events", () => {
  const input = [
    { kind: "create", paths: ["file.html"] },
    { kind: "modify", paths: ["file.html"] },
    { kind: "remove", paths: ["other.js"] },
  ];

  const result = reduceEvents(input);
  assertEquals(result.get("file.html"), "create");
  assertEquals(result.get("other.js"), "remove");
});

Deno.test("classifyPath - identifies asset types", () => {
  assertEquals(classifyPath("/media/image.png"), "ASSET");
  assertEquals(classifyPath("/src/main.css"), "ASSET");
  assertEquals(classifyPath("/src-svg/icon.svg"), "SVG_INLINE");
  assertEquals(classifyPath("/templates/component.js"), "TEMPLATE");
  assertEquals(classifyPath("/page.html"), "PAGE_HTML");
});

