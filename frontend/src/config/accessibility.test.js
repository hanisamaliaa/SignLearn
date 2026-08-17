import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_ACCESSIBILITY_PREFERENCES,
  sanitizeAccessibilityPreferences,
} from "./accessibility.js";

test("accessibility preferences use safe defaults", () => {
  assert.deepEqual(
    sanitizeAccessibilityPreferences(null),
    DEFAULT_ACCESSIBILITY_PREFERENCES,
  );
});

test("invalid accessibility values are sanitized", () => {
  assert.deepEqual(
    sanitizeAccessibilityPreferences({
      textSize: "huge",
      highContrast: "yes",
      reduceMotion: 1,
      theme: "system",
    }),
    {
      textSize: "normal",
      highContrast: false,
      reduceMotion: false,
      theme: "light",
    },
  );
});
