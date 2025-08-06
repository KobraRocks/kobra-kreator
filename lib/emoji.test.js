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

Deno.test("logWithEmoji logs errors with emoji", () => {
  const errors = [];
  const orig = console.error;
  console.error = (msg) => errors.push(msg);
  try {
    logWithEmoji("error", "Something failed");
  } finally {
    console.error = orig;
  }
  assertEquals(errors.length, 1);
  assertEquals(errors[0], "❌ Something failed");
});

Deno.test("logWithEmoji logs warnings with emoji", () => {
  const warnings = [];
  const orig = console.warn;
  console.warn = (msg) => warnings.push(msg);
  try {
    logWithEmoji("warning", "Be careful");
  } finally {
    console.warn = orig;
  }
  assertEquals(warnings.length, 1);
  assertEquals(warnings[0], "⚠️ Be careful");
});
