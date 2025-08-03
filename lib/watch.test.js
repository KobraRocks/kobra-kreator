import { classifyPath, reduceEvents } from "./watch.js";
import { assertEquals } from "@std/assert";

denoTest();

function denoTest() {
  Deno.test("reduceEvents dedupes and promotes", () => {
    const events = [
      { kind: "create", paths: ["/a.html"] },
      { kind: "modify", paths: ["/a.html"] },
      { kind: "modify", paths: ["/a.html"] },
    ];
    const res = reduceEvents(events);
    assertEquals(res.get("/a.html"), "create");
  });

  Deno.test("reduceEvents handles remove", () => {
    const events = [
      { kind: "remove", paths: ["/a.html"] },
      { kind: "remove", paths: ["/a.html"] },
    ];
    const res = reduceEvents(events);
    assertEquals(res.get("/a.html"), "remove");
  });

  Deno.test("classifyPath identifies types", () => {
    assertEquals(classifyPath("/src/site/page.html"), "PAGE_HTML");
    assertEquals(classifyPath("/templates/head.js"), "TEMPLATE");
    assertEquals(classifyPath("/src/site/src-svg/icon.svg"), "SVG_INLINE");
    assertEquals(classifyPath("/src/site/js/app.js"), "ASSET");
    assertEquals(classifyPath("/src/site/media/logo.png"), "ASSET");
  });
}
