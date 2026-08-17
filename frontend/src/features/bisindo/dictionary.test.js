import assert from "node:assert/strict";
import test from "node:test";
import { LETTERS, groupByCategory, matchLetters, summarise } from "./dictionary.js";

test("ships the whole alphabet", () => {
  assert.equal(LETTERS.length, 26);
  assert.equal(LETTERS[0], "A");
  assert.equal(LETTERS[25], "Z");
});

test("an empty search shows every letter", () => {
  for (const query of ["", "   ", null, undefined]) {
    assert.equal(matchLetters(query).length, 26, JSON.stringify(query));
  }
});

test("searching a word reveals the letters that spell it", () => {
  // Yang diketik orang di kamus abjad biasanya kata yang ingin mereka eja.
  // Hasil kosong tidak membantu siapa pun.
  assert.deepEqual(matchLetters("aku"), ["A", "K", "U"]);
});

test("returns letters in alphabetical order, not the order typed", () => {
  assert.deepEqual(matchLetters("uka"), ["A", "K", "U"]);
});

test("lists a repeated letter only once", () => {
  assert.deepEqual(matchLetters("mama"), ["A", "M"]);
});

test("ignores case and characters that are not letters", () => {
  assert.deepEqual(matchLetters("A-b!"), ["A", "B"]);
  assert.deepEqual(matchLetters("aKu"), ["A", "K", "U"]);
});

test("a search with no letters at all matches nothing", () => {
  // Berbeda dari pencarian kosong: "123" adalah permintaan yang jelas dan
  // jawabannya memang tidak ada, bukan alasan menampilkan seluruh abjad.
  assert.deepEqual(matchLetters("123"), []);
  assert.deepEqual(matchLetters("!!"), []);
});

const words = [
  { word: "Ibu", category: "Keluarga" },
  { word: "Halo", category: "Sapaan" },
  { word: "Ayah", category: "Keluarga" },
  { word: "Maaf", category: "Sapaan" },
];

test("groups words under their category", () => {
  const groups = groupByCategory(words);
  assert.deepEqual(groups.map((group) => group.category), ["Keluarga", "Sapaan"]);
  assert.deepEqual(groups[0].items.map((item) => item.word), ["Ayah", "Ibu"]);
  assert.deepEqual(groups[1].items.map((item) => item.word), ["Halo", "Maaf"]);
});

test("orders categories and words the same way every time", () => {
  // Urutan yang berubah tiap muat membuat orang kehilangan tempatnya.
  const once = groupByCategory(words);
  const twice = groupByCategory(words.slice().reverse());
  assert.deepEqual(
    once.map((group) => `${group.category}:${group.items.map((i) => i.word).join(",")}`),
    twice.map((group) => `${group.category}:${group.items.map((i) => i.word).join(",")}`),
  );
});

test("does not mutate the list it was given", () => {
  const input = [{ word: "Ibu", category: "Keluarga" }, { word: "Ayah", category: "Keluarga" }];
  const snapshot = input.map((item) => item.word);
  groupByCategory(input);
  assert.deepEqual(input.map((item) => item.word), snapshot);
});

test("falls back to Umum for a missing or blank category", () => {
  const groups = groupByCategory([{ word: "X" }, { word: "Y", category: "  " }]);
  assert.deepEqual(groups.map((group) => group.category), ["Umum"]);
  assert.equal(groups[0].items.length, 2);
});

test("handles an empty or missing word list", () => {
  assert.deepEqual(groupByCategory([]), []);
  assert.deepEqual(groupByCategory(), []);
});

test("summarises the alphabet as complete regardless of the search", () => {
  // Angka ini menjawab "seberapa lengkap kamusnya", bukan "berapa yang lolos
  // filter" — jadi selalu 26.
  assert.equal(summarise([]).letters, 26);
  assert.equal(summarise(words).letters, 26);
});

test("summarises word and category counts", () => {
  const summary = summarise(words);
  assert.equal(summary.words, 4);
  assert.equal(summary.categories, 2);
});
