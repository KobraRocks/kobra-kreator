import { applyTemplates } from "../lib/apply-templates.js";
import { DOMParser } from "@b-fuze/deno-dom";
import { join } from "@std/path";

/**
 * Minimal equality assertion for tests.
 * @param {*} actual Value produced by the test.
 * @param {*} expected Expected value.
 */
function assertEquals(actual, expected) {
  const da = JSON.stringify(actual);
  const db = JSON.stringify(expected);
  if (da !== db) {
    throw new Error(`Assertion failed: expected ${db}, got ${da}`);
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
      appendChild: (el) => {
        this.body = el;
      },
    };
  }
  createElement(tag) {
    return new Element(tag);
  }
}

Deno.test("applyTemplates inserts rendered fragments", async () => {
  const doc = new StubDocument();

  const frontMatter = {
    title: "Example",
    templates: {
      head: "default",
      nav: "default",
      footer: "default",
    },
  };
  const page = { frontMatter, html: "hi" };
  const links = { nav: [], footer: [] };
  const config = { distantDirectory: "/tmp" };
  const root = new URL("./", import.meta.url);
  const siteDir = root.pathname;
  const used = await applyTemplates(doc, page, links, config, root, siteDir);

  assertEquals(doc.head.innerHTML.includes("<title>Example</title>"), true);
  assertEquals(
    doc.body.innerHTML.replace(/\s+/g, ""),
    "<nav>nav</nav><main>hi</main><footer>foot</footer>",
  );
  assertEquals(used.length, 3);
  const endsWith = used.map((p) => p.slice(p.indexOf("templates")));
  assertEquals(
    endsWith.sort(),
    [
      "templates/footer/default.js",
      "templates/head/default.js",
      "templates/nav/default.js",
    ].sort(),
  );
});

Deno.test("applyTemplates handles document with no root element", async () => {
  const parser = new DOMParser();
  const doc = parser.parseFromString("", "text/html");
  const frontMatter = {
    title: "Example",
    templates: { head: "default" },
  };
  const page = { frontMatter, html: "" };
  const links = { nav: [], footer: [] };
  const config = { distantDirectory: "/tmp" };
  const root = new URL("./", import.meta.url);
  const siteDir = root.pathname;
  await applyTemplates(doc, page, links, config, root, siteDir);
  assertEquals(doc.head.innerHTML, "<title>Example</title>");

});

Deno.test("applyTemplates falls back to core templates", async () => {
  const doc = new StubDocument();

  const frontMatter = {
    title: "Example",
    templates: { head: "default", nav: "default", footer: "default" },
  };
  const page = { frontMatter, html: "hi" };
  const links = { nav: [], footer: [] };
  const config = { distantDirectory: "/tmp" };

  // Provide a root directory without templates to trigger fallback.
  const root = new URL("./no-templates/", import.meta.url);
  const siteDir = root.pathname;
  const used = await applyTemplates(doc, page, links, config, root, siteDir);

  assertEquals(doc.head.innerHTML.includes("<title>Example</title>"), true);
  assertEquals(
    doc.body.innerHTML.replace(/\s+/g, ""),
    "<nav></nav><main>hi</main><footer></footer>",
  );
  const endsWith = used.map((p) => p.slice(p.indexOf("core/templates")));
  assertEquals(
    endsWith.sort(),
    [
      "core/templates/footer/default.js",
      "core/templates/head/default.js",
      "core/templates/nav/default.js",
    ].sort(),
  );
});

Deno.test(
  "applyTemplates errors when template missing in project and core",
  async () => {
    const doc = new StubDocument();

    const frontMatter = {
      title: "Example",
      templates: { head: "missing" },
    };
    const page = { frontMatter, html: "hi" };
    const links = { nav: [], footer: [] };
    const config = { distantDirectory: "/tmp" };
    const root = new URL("./no-templates/", import.meta.url);
    const siteDir = root.pathname;

    let threw = false;
    try {
      await applyTemplates(doc, page, links, config, root, siteDir);
    } catch (err) {
      threw = true;
      assertEquals(
        err.message.includes(
          "Template head/missing.js not found in site, project, or core directories",
        ),
        true,
      );
    }
    if (!threw) throw new Error("Expected applyTemplates to throw");
  },
);

Deno.test("applyTemplates prefers site templates over shared", async () => {
  const doc = new StubDocument();

  const frontMatter = {
    title: "Example",
    templates: { head: "default" },
  };
  const page = { frontMatter, html: "hi" };
  const links = { nav: [], footer: [] };
  const config = { distantDirectory: "/tmp" };
  const root = new URL("./", import.meta.url);
  const siteDir = await Deno.makeTempDir();

  try {
    await Deno.mkdir(join(siteDir, "templates", "head"), { recursive: true });
    await Deno.writeTextFile(
      join(siteDir, "templates", "head", "default.js"),
      "export function render() { return '<meta name=\"site\" content=\"override\">'; }",
    );

    const used = await applyTemplates(doc, page, links, config, root, siteDir);

    assertEquals(
      doc.head.innerHTML.includes(
        '<meta name="site" content="override">',
      ),
      true,
    );
    assertEquals(
      used.includes(join(siteDir, "templates", "head", "default.js")),
      true,
    );
  } finally {
    await Deno.remove(siteDir, { recursive: true });
  }
});
