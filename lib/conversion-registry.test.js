import { convert, registerConverter } from "./conversion-registry.js";
import { assertEquals } from "@std/assert";

Deno.test("convert returns input when no converter registered", async () => {
  const input = "<p>hi</p>";
  const output = await convert("note.txt", input);
  assertEquals(output, input);
});

Deno.test("registerConverter applies transformation", async () => {
  registerConverter(".foo", (c) => c.toUpperCase());
  const output = await convert("test.foo", "bar");
  assertEquals(output, "BAR");
  registerConverter(".foo");
});
