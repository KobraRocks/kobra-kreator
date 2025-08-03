import { markdownToHTML } from "./markdown.js";
import { assertEquals } from "@std/assert";

Deno.test("markdownToHTML converts basic elements", () => {
    const input = "# Heading\n\nThis is **bold** and *italic* text.";
    const expected = "<h1>Heading</h1>\n<p>This is <strong>bold</strong> and <em>italic</em> text.</p>\n";
    assertEquals(markdownToHTML(input), expected);
});

Deno.test("markdownToHTML handles code blocks and escaping", () => {
    const input = "```js\nconsole.log(\"<&>\");\n```\n";
    const expected =
        "<pre><code class=\"language-js\">console.log(&quot;&lt;&amp;&gt;&quot;);\n</code></pre>\n";
    assertEquals(markdownToHTML(input), expected);
});

Deno.test("markdownToHTML processes tables", () => {
    const input = "| a | b |\n| --- | ---: |\n| 1 | 2 |\n";
    const expected =
        "<table>\n<thead>\n<tr>\n<th>a</th>\n<th>b</th>\n</tr>\n</thead>\n<tbody>\n<tr>\n<td align=\"left\">1</td>\n<td align=\"right\">2</td>\n</tr>\n</tbody>\n</table>\n";
    assertEquals(markdownToHTML(input), expected);
});

