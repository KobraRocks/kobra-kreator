import { applyTemplates } from "../lib/apply-templates.js";

function assertEquals(actual, expected) {
  if (actual !== expected) {
    throw new Error(`Assertion failed: expected ${expected}, got ${actual}`);
  }
}

class Element {
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    this.innerHTML = "";
  }
}

class StubDocument {
  constructor() {
    this.head = new Element("head");
    this.body = new Element("body");
    this.documentElement = {
      prepend: (el) => {
        this.head = el;
      },
    };
  }
  createElement(tag) {
    return new Element(tag);
  }
}

Deno.test("applyTemplates inserts rendered fragments", async () => {
  const doc = new StubDocument();
  doc.body.innerHTML = "<main>hi</main>";

  const frontMatter = {
    title: "Example",
    templates: {
      head: "default",
      nav: "default",
      footer: "default",
    },
  };
  const links = { nav: [], footer: [] };

  const root = new URL("./", import.meta.url);
  await applyTemplates(doc, frontMatter, links, root);

  assertEquals(doc.head.innerHTML, "<title>Example</title>");
  assertEquals(
    doc.body.innerHTML,
    "<nav>nav</nav><main>hi</main><footer>foot</footer>",
  );
});

