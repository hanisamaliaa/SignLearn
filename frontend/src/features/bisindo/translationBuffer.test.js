import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { addSpace, appendCharacter, removeLastCharacter } from "./translationBuffer.js";

test("delete removes exactly the last committed character", () => {
  assert.deepEqual(removeLastCharacter(["A", "B", "C"]), ["A", "B"]);
});

test("clear result is represented by an empty committed buffer", () => {
  const result = [];
  assert.equal(result.join(""), "");
});

test("space is not duplicated", () => {
  assert.deepEqual(addSpace(["A", " "], 500), ["A", " "]);
  assert.deepEqual(addSpace(["A"], 500), ["A", " "]);
});

test("long output CSS wraps continuous strings without horizontal overflow", async () => {
  const css = await readFile(new URL("../../styles/index.css", import.meta.url), "utf8");
  assert.match(css, /\.kids-result-text[^}]*overflow-wrap:\s*anywhere/);
  assert.match(css, /\.kids-detected-copy[^}]*overflow-x:\s*hidden/);
  assert.match(css, /\.kids-detected-copy[^}]*overflow-y:\s*auto/);
});

test("continuous alphabet result remains intact before rendering", () => {
  const input = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".repeat(3);
  const output = [...input].reduce((current, character) => appendCharacter(current, character, 500), []);
  assert.equal(output.join(""), input);
});
