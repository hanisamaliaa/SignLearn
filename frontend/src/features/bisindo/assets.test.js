import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import test from "node:test";

const ASSET_DIRECTORY = new URL("../../assets/bisindo/", import.meta.url);
const EXPECTED = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  .split("")
  .map((letter) => `${letter.toLowerCase()}.webp`);

test("production alphabet directory contains exactly one card for A-Z", () => {
  const actual = readdirSync(ASSET_DIRECTORY)
    .filter((name) => /^[a-z]\.webp$/.test(name))
    .sort();
  assert.deepEqual(actual, EXPECTED);
});

test("every approved alphabet card is a non-empty WebP asset", () => {
  for (const filename of EXPECTED) {
    assert.ok(
      statSync(new URL(filename, ASSET_DIRECTORY)).size > 1_000,
      `${filename} terlalu kecil atau kosong`,
    );
  }
});

test("manifest locks the source and every lossless 1024px output", () => {
  const manifest = JSON.parse(
    readFileSync(new URL("MANIFEST.json", ASSET_DIRECTORY), "utf8"),
  );
  assert.equal(manifest.lossless, true);
  assert.equal(
    manifest.sourceSha256,
    "71cfdcaaddd0f61226c5a95b4b1994da68430f0d7b8544710d53d2b0ea1bee1b",
  );
  assert.deepEqual(Object.keys(manifest.assets), "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""));

  for (const letter of Object.keys(manifest.assets)) {
    const item = manifest.assets[letter];
    const bytes = readFileSync(new URL(item.file, ASSET_DIRECTORY));
    assert.equal(item.width, 1024, `${letter} harus selebar 1024px`);
    assert.equal(item.height, 1024, `${letter} harus setinggi 1024px`);
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      item.sha256,
      `hash ${letter} tidak cocok dengan manifest`,
    );
  }
});
