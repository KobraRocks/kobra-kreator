import { parsePage } from "./parse-page.js";
import { assertEquals } from "jsr:@std/assert";
import { stub } from "jsr:@std/testing/mock";

Deno.test("parsePage extracts front-matter and html", async () => {
  const tmp = await Deno.makeTempFile({ suffix: ".html" });
  const content = `title = "Hello"
[templates]
head = "default"
#---#
<body>Hi</body>`;
  await Deno.writeTextFile(tmp, content);
  const result = await parsePage(tmp);
  assertEquals(result.frontMatter.title, "Hello");
  assertEquals(result.templates.head, "default");
  assertEquals(result.html.trim(), "<body>Hi</body>");
});

Deno.test("warns on unknown keys", async () => {
  const tmp = await Deno.makeTempFile({ suffix: ".html" });
  const content = `title = "X"
foo = 1
[templates]
head = "x"
#---#
<p></p>`;
  await Deno.writeTextFile(tmp, content);
  const warn = stub(console, "warn");
  try {
    await parsePage(tmp);
    assertEquals(warn.calls.length, 1);
  } finally {
    warn.restore();
  }
});
