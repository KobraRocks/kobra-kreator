import { convert } from "../lib/conversion-registry.js";
import "./markdown.js";
import { assertEquals } from "@std/assert";

Deno.test("markdown converter transforms basic elements", async () => {
  const input = "# Heading\n\nThis is **bold** and *italic* text.";
  const expected =
    "<h1>Heading</h1>\n<p>This is <strong>bold</strong> and <em>italic</em> text.</p>\n";
  const result = await convert("test.md", input);
  assertEquals(result, expected);
});

Deno.test("markdown converter handles code blocks and escaping", async () => {
  const input = '```js\nconsole.log("<&>");\n```\n';
  const expected =
    '<pre><code class="language-js">console.log(&quot;&lt;&amp;&gt;&quot;);\n</code></pre>\n';
  const result = await convert("code.md", input);
  assertEquals(result, expected);
});

Deno.test("markdown converter processes tables", async () => {
  const input = "| a | b |\n| --- | ---: |\n| 1 | 2 |\n";
  const expected =
    '<table>\n<thead>\n<tr>\n<th>a</th>\n<th align="right">b</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>1</td>\n<td align="right">2</td>\n</tr>\n</tbody></table>\n';
  const result = await convert("table.md", input);
  assertEquals(result, expected);
});
