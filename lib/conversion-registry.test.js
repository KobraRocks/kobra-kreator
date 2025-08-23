import { registerConverter, convert } from "./conversion-registry.js";
import { assertEquals } from "@std/assert";

Deno.test("convert applies registered converter", () => {
  registerConverter(".txt", (_path, content) => content.toUpperCase());
  const result = convert("/tmp/example.txt", "hello");
  assertEquals(result, "HELLO");
});
