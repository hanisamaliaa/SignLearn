import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("../../pages/user/Lesson.jsx", import.meta.url),
  "utf8",
);

test("lesson keeps completion, next navigation, and safe quiz question rows", () => {
  assert.match(source, /Tandai selesai/);
  assert.match(source, /Lanjut ke pelajaran berikutnya/);
  assert.match(source, /lesson-question-rows/);
  assert.match(source, /setSelectedLesson\(target\.id\)/);
  assert.doesNotMatch(source, /correctIndex|correctAnswer/);
});

test("completed lesson presents exactly one final quiz action", () => {
  assert.equal(source.match(/"Mulai Quiz"/g)?.length ?? 0, 1);
  assert.equal(source.match(/"🔒 Quiz Premium"/g)?.length ?? 0, 1);
});
