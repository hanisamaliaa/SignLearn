import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("../../pages/user/Dictionary.jsx", import.meta.url),
  "utf8",
);

test("learner dictionary renders image, YouTube, direct video, and alphabet fallback", () => {
  assert.match(source, /item\.signImage/);
  assert.match(source, /item\.signVideo/);
  assert.match(source, /youtube-nocookie\.com\/embed/);
  assert.match(source, /<video controls playsInline/);
  assert.match(source, /Ejaan alfabet BISINDO/);
});
