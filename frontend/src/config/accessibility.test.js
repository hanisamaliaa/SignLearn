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

test("subtitle remains disabled when an older preference has no subtitle value", () => {
  assert.equal(sanitizeAccessibilityPreferences({ highContrast: true }).subtitles, false);
});

test("invalid accessibility values are sanitized", () => {
  assert.deepEqual(
    sanitizeAccessibilityPreferences({
      textSize: "huge",
      highContrast: "yes",
      reduceMotion: 1,
      subtitles: false,
      focusMode: true,
      theme: "system",
    }),
    {
      textSize: "normal",
      highContrast: false,
      reduceMotion: false,
      subtitles: false,
      focusMode: true,
      theme: "light",
    },
  );
});
