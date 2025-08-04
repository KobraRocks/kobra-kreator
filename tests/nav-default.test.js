import { render } from "../core/templates/nav/default.js";

/**
 * Minimal equality assertion for tests.
 * @param {*} actual
 * @param {*} expected
 */
function assertEquals(actual, expected) {
  const da = JSON.stringify(actual);
  const db = JSON.stringify(expected);
  if (da !== db) throw new Error(`Assertion failed: expected ${db}, got ${da}`);
}

Deno.test("nav template renders dropdown", () => {
  const links = {
    nav: [
      { href: "/", label: "<logo src=\"\"></logo>", topLevel: true },
      { href: "/ai-generator", label: "Ai Generator", subLevel: "Product" },
      { href: "/script-reader", label: "Script reader", subLevel: "Product" },
      { href: "/blog", label: "Blog", topLevel: true },
    ],
  };
  const html = render({ links });
  const expected = [
    '<nav><a href="/"><logo src=""></logo></a>',
    '<details><summary>Product</summary><ul>',
    '<li><a href="/ai-generator">Ai Generator</a></li>',
    '<li><a href="/script-reader">Script reader</a></li>',
    '</ul></details><a href="/blog">Blog</a></nav>',
  ].join("");
  assertEquals(html, expected);
});
