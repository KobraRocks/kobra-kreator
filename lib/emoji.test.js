import { getEmoji, logWithEmoji } from "./emoji.js";

function assertEquals(actual, expected) {
  if (actual !== expected) {
    throw new Error(`Assertion failed: expected ${expected}, got ${actual}`);
  }
}

Deno.test("getEmoji returns correct emoji", () => {
  assertEquals(getEmoji("success"), "✅");
  assertEquals(getEmoji("unknown"), "");
});

Deno.test("logWithEmoji prefixes message with emoji", () => {
  const logs = [];
  const orig = console.log;
  console.log = (msg) => logs.push(msg);
  try {
    logWithEmoji("error", "Something failed");
  } finally {
    console.log = orig;
  }
  assertEquals(logs.length, 1);
  assertEquals(logs[0], "❌ Something failed");
});
