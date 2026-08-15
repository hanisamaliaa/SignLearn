import assert from "node:assert/strict";
import test from "node:test";
import {
  validateCreateTranslation,
  validateLookup,
  validateTranslationQuery,
  validateUpdateTranslation,
} from "../src/validators/translationValidator.js";
import { normalizeWord } from "../src/utils/normalizeWord.js";

test("normalizes Indonesian word-bank queries consistently", () => {
  assert.equal(normalizeWord("  TERIMA   KASIH  "), "terima kasih");
  assert.equal(normalizeWord("ＭＡＡＦ"), "maaf");
});

test("accepts a valid word-bank entry", () => {
  assert.deepEqual(validateCreateTranslation({
    word: "Terima kasih",
    translation: "TERIMA KASIH",
    category: "Sapaan",
    status: "active",
    aliases: ["makasih"],
    signVideo: "https://cdn.example.test/terima-kasih.mp4",
  }), []);
});

test("rejects invalid media, status, and empty required fields", () => {
  const errors = validateCreateTranslation({
    word: " ", translation: "", status: "draft", signImage: "javascript:alert(1)",
  });
  assert.deepEqual(errors.map((error) => error.field), ["word", "translation", "signImage", "status"]);
});

test("requires at least one update field", () => {
  assert.equal(validateUpdateTranslation({})[0].field, "body");
});

test("validates lookup and list query", () => {
  assert.equal(validateLookup(null, null, {}).length, 1);
  assert.equal(validateTranslationQuery(null, null, { q: "a" }).length, 1);
  assert.deepEqual(validateLookup(null, null, { word: "halo" }), []);
});
