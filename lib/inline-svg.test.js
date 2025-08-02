import { inlineSvg } from "./inline-svg.js";

function assertEquals(actual, expected) {
  if (actual !== expected) {
    throw new Error(`Assertion failed: expected ${expected}, got ${actual}`);
  }
}

class StubElement {
  constructor(tag, src) {
    this.tagName = tag;
    this._src = src;
    this._outerHTML = `<${tag} src="${src}" />`;
  }
  getAttribute(name) {
    return name === "src" ? this._src : null;
  }
  set outerHTML(value) {
    this._outerHTML = value;
  }
  get outerHTML() {
    return this._outerHTML;
  }
}

class StubDocument {
  constructor(elements) {
    this.elements = elements;
  }
  querySelectorAll(selector) {
    const tags = selector.split(",").map((s) => s.trim());
    return this.elements.filter((el) => tags.includes(el.tagName));
  }
}

Deno.test("inlineSvg replaces node with SVG content", async () => {
  const root = await Deno.makeTempDir();
  await Deno.mkdir(`${root}/src-svg`, { recursive: true });
  await Deno.writeTextFile(`${root}/src-svg/check.svg`, "<svg>ok</svg>");
  const el = new StubElement("icon", "check.svg");
  const doc = new StubDocument([el]);
  const rootUrl = new URL(root + "/", import.meta.url);
  await inlineSvg(doc, rootUrl);
  assertEquals(el.outerHTML, "<svg>ok</svg>");
});

Deno.test("inlineSvg logs error when SVG missing", async () => {
  const root = await Deno.makeTempDir();
  await Deno.mkdir(`${root}/src-svg`, { recursive: true });
  const el = new StubElement("icon", "missing.svg");
  const doc = new StubDocument([el]);
  const rootUrl = new URL(root + "/", import.meta.url);
  const errors = [];
  const orig = console.error;
  console.error = (msg) => errors.push(msg);
  try {
    await inlineSvg(doc, rootUrl);
  } finally {
    console.error = orig;
  }
  assertEquals(errors.length, 1);
  assertEquals(el.outerHTML, '<icon src="missing.svg" />');
});

