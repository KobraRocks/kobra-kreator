import { LinksManager } from "./links.js";
import { assertEquals } from "jsr:@std/assert";

Deno.test("LinksManager merges links and writes only when changed", async () => {
  const dir = await Deno.makeTempDir();
  const path = `${dir}/links.json`;
  await Deno.writeTextFile(
    path,
    JSON.stringify({ nav: [], footer: [] }, null, 2) + "\n",
  );

  const lm = new LinksManager(path);
  await lm.load();

  lm.merge("/about.html", { nav: { topLevel: true, label: "About" } });
  lm.merge("/contact.html", {
    footer: { column: "company", label: "Contact" },
  });
  await lm.save();

  let text = await Deno.readTextFile(path);
  let data = JSON.parse(text);
  assertEquals(data.nav.length, 1);
  assertEquals(data.nav[0].href, "/about.html");
  assertEquals(data.nav[0].label, "About");
  assertEquals(data.footer.length, 1);
  assertEquals(data.footer[0].column, "company");

  const m1 = (await Deno.stat(path)).mtime;

  lm.merge("/about.html", { nav: { topLevel: true, label: "About" } });
  await lm.save();
  const m2 = (await Deno.stat(path)).mtime;
  assertEquals(m1.getTime(), m2.getTime());

  lm.merge("/about.html", { nav: { topLevel: true, label: "About Us" } });
  await lm.save();
  text = await Deno.readTextFile(path);
  data = JSON.parse(text);
  assertEquals(data.nav.length, 1);
  assertEquals(data.nav[0].label, "About Us");
});
