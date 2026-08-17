import assert from "node:assert/strict";
import test from "node:test";
import { MAX_PHRASE_LENGTH, describeSkipped, spellPhrase, toSpellingText } from "./spelling.js";

const shape = (result) =>
  result.words.map((word) => `${word.text}:${word.letters.join("-")}`);

test("spells the example from the brief, one word at a time", () => {
  const result = spellPhrase("aku mau makan");
  assert.deepEqual(shape(result), ["AKU:A-K-U", "MAU:M-A-U", "MAKAN:M-A-K-A-N"]);
  assert.equal(result.letterCount, 11);
  assert.deepEqual(result.skipped, []);
  assert.equal(result.isEmpty, false);
});

test("serialises an alphabet spelling for the bank kata API", () => {
  assert.equal(toSpellingText("Aku mau makan"), "A-K-U M-A-U M-A-K-A-N");
  assert.equal(toSpellingText("Halo!"), "H-A-L-O");
});

test("keeps word boundaries rather than one long run of letters", () => {
  // Inti fiturnya. "AKUMAUMAKAN" tanpa jeda tidak terbaca sebagai apa pun.
  const result = spellPhrase("aku mau makan");
  assert.equal(result.words.length, 3);
});

test("uppercases regardless of how it was typed", () => {
  assert.deepEqual(shape(spellPhrase("AkU")), ["AKU:A-K-U"]);
  assert.deepEqual(shape(spellPhrase("aku")), ["AKU:A-K-U"]);
});

test("collapses every kind of whitespace", () => {
  // Hasil pengenalan suara kerap membawa spasi ganda, dan textarea membawa
  // baris baru. Keduanya harus jadi satu pemisah kata yang sama.
  const result = spellPhrase("  aku\n\nmau \t makan  ");
  assert.deepEqual(shape(result), ["AKU:A-K-U", "MAU:M-A-U", "MAKAN:M-A-K-A-N"]);
});

test("flattens accents to their base letter", () => {
  // "é" memakai bentuk tangan yang sama dengan "E"; menolaknya hanya
  // membingungkan. Ditulis sebagai NFC dan NFD karena papan ketik berbeda
  // menghasilkan keduanya untuk karakter yang terlihat identik.
  assert.deepEqual(shape(spellPhrase("café")), ["CAFE:C-A-F-E"]);
  assert.deepEqual(shape(spellPhrase("café")), ["CAFE:C-A-F-E"]);
});

test("reports characters that have no sign instead of dropping them quietly", () => {
  const result = spellPhrase("aku 5 tahun!");
  assert.deepEqual(shape(result), ["AKU:A-K-U", "TAHUN!:T-A-H-U-N"]);
  assert.deepEqual(result.skipped, ["5", "!"]);
});

test("lists each unsupported character once, in the order first seen", () => {
  const result = spellPhrase("a1b1c2!!");
  assert.deepEqual(result.skipped, ["1", "2", "!"]);
});

test("a word made entirely of unsupported characters produces no empty tile", () => {
  // Tanpa penjagaan ini, "aku 123" menghasilkan kata kedua tanpa huruf sama
  // sekali dan UI menggambar kotak kosong tanpa penjelasan.
  const result = spellPhrase("aku 123");
  assert.deepEqual(shape(result), ["AKU:A-K-U"]);
  assert.deepEqual(result.skipped, ["1", "2", "3"]);
});

test("reports emptiness for input that can never be spelled", () => {
  for (const input of ["", "   ", "123", "!!!", null, undefined]) {
    const result = spellPhrase(input);
    assert.equal(result.isEmpty, true, `seharusnya kosong: ${JSON.stringify(input)}`);
    assert.equal(result.letterCount, 0);
    assert.deepEqual(result.words, []);
  }
});

test("truncates at the same limit the textarea enforces", () => {
  // Batasnya diterapkan pada teks, bukan pada jumlah huruf: tanpa itu,
  // tempelan sepanjang sepuluh ribu karakter menghasilkan ribuan gambar.
  const result = spellPhrase("a".repeat(MAX_PHRASE_LENGTH + 50));
  assert.equal(result.letterCount, MAX_PHRASE_LENGTH);
});

test("handles a phrase of only spaces between words", () => {
  assert.deepEqual(shape(spellPhrase("a  b")), ["A:A", "B:B"]);
});

test("describes skipped characters, or says nothing at all", () => {
  assert.equal(describeSkipped([]), "");
  assert.equal(describeSkipped(null), "");
  assert.equal(describeSkipped(undefined), "");
  assert.match(describeSkipped(["5"]), /A-Z/);
  assert.match(describeSkipped(["5"]), /5/);
});

test("summarises a long list of skipped characters instead of printing all", () => {
  const message = describeSkipped(["1", "2", "3", "4", "5", "6", "7", "8"]);
  assert.match(message, /dan 2 karakter lain/);
  assert.ok(!message.includes("8"), "karakter ke-8 seharusnya diringkas");
});

test("does not claim extras when exactly six are skipped", () => {
  const message = describeSkipped(["1", "2", "3", "4", "5", "6"]);
  assert.ok(!message.includes("karakter lain"), message);
});
