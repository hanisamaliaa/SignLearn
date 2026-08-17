import assert from "node:assert/strict";
import test from "node:test";
import { WORD_BANK, spellOut } from "../src/database/wordBank.js";
import { normalizeWord } from "../src/utils/normalizeWord.js";

test("spells a single word with dashes between letters", () => {
  assert.equal(spellOut("Halo"), "H-A-L-O");
});

test("keeps word boundaries as spaces, letters as dashes", () => {
  // Bentuk inilah yang membuat "S-E-L-A-M-A-T P-A-G-I" terbaca sebagai dua
  // kata, bukan satu rentetan huruf.
  assert.equal(spellOut("Selamat pagi"), "S-E-L-A-M-A-T P-A-G-I");
});

test("drops characters that have no sign rather than spelling them", () => {
  assert.equal(spellOut("Halo!"), "H-A-L-O");
  assert.equal(spellOut("Kelas 1"), "K-E-L-A-S");
});

test("every entry carries the fields the dictionary renders", () => {
  for (const entry of WORD_BANK) {
    assert.ok(entry.word?.trim(), `kata kosong: ${JSON.stringify(entry)}`);
    assert.ok(entry.translation?.trim(), `ejaan kosong: ${entry.word}`);
    assert.ok(entry.description?.trim(), `deskripsi kosong: ${entry.word}`);
    assert.ok(entry.category?.trim(), `kategori kosong: ${entry.word}`);
    assert.ok(Array.isArray(entry.aliases), `alias bukan daftar: ${entry.word}`);
  }
});

test("no entry ships a media URL", () => {
  // Justru tautan media asal-asalan yang merusak baris pertama di basis data.
  // Kata dirender dari gambar abjad, jadi tidak ada berkas yang bisa hilang.
  for (const entry of WORD_BANK) {
    assert.equal(entry.signImage, undefined, entry.word);
    assert.equal(entry.signVideo, undefined, entry.word);
  }
});

test("the spelled form matches the word it belongs to", () => {
  for (const entry of WORD_BANK) {
    assert.equal(entry.translation, spellOut(entry.word), entry.word);
  }
});

test("every word can be rendered from the A-Z images we actually have", () => {
  // Bila sebuah kata mengandung karakter di luar A-Z, kamus akan menggambar
  // kotak kosong. Lebih baik ketahuan di sini.
  for (const entry of WORD_BANK) {
    assert.match(entry.translation, /^[A-Z](-[A-Z])*( [A-Z](-[A-Z])*)*$/, entry.word);
  }
});

test("words are unique after normalisation", () => {
  // `normalized_word` UNIQUE di basis data; bentrokan membuat seed gagal
  // separuh jalan alih-alih di sini.
  const seen = new Map();
  for (const entry of WORD_BANK) {
    const key = normalizeWord(entry.word);
    assert.equal(seen.has(key), false, `kata ganda: ${entry.word} vs ${seen.get(key)}`);
    seen.set(key, entry.word);
  }
});

test("no alias collides with another entry's word", () => {
  // `findExact` mencocokkan `normalized_word = $1 OR $1 = ANY(aliases)`.
  // Alias yang sama dengan kata milik entri lain membuat pencarian
  // mengembalikan salah satu dari keduanya, tergantung urutan baris.
  const words = new Set(WORD_BANK.map((entry) => normalizeWord(entry.word)));
  for (const entry of WORD_BANK) {
    for (const alias of entry.aliases) {
      assert.equal(
        words.has(normalizeWord(alias)), false,
        `alias "${alias}" pada "${entry.word}" bertabrakan dengan kata lain`,
      );
    }
  }
});

test("no alias is claimed by two entries", () => {
  const owner = new Map();
  for (const entry of WORD_BANK) {
    for (const alias of entry.aliases) {
      const key = normalizeWord(alias);
      assert.equal(
        owner.has(key), false,
        `alias "${alias}" dipakai "${entry.word}" dan "${owner.get(key)}"`,
      );
      owner.set(key, entry.word);
    }
  }
});

test("groups the alphabet is deliberately absent from", () => {
  // Abjad hidup sebagai aset yang dikompilasi, bukan baris basis data: satu
  // penghapusan yang salah sasaran tidak boleh membuat penerjemah kehilangan
  // huruf.
  const singleLetters = WORD_BANK.filter((entry) => entry.word.trim().length === 1);
  assert.deepEqual(singleLetters, []);
});

test("ships enough material to be worth opening", () => {
  assert.ok(WORD_BANK.length >= 30, `baru ${WORD_BANK.length} kata`);
  const categories = new Set(WORD_BANK.map((entry) => entry.category));
  assert.ok(categories.size >= 4, `baru ${categories.size} kategori`);
});
