import assert from "node:assert/strict";
import test from "node:test";
import {
  advanceSpell,
  createSpellState,
  expectedLetter,
  normalizeTarget,
  spellCells,
  spelledAnswer,
  spellMistakes,
} from "./spellTracker.js";

/** Memperagakan serangkaian huruf berurutan. */
const sign = (state, letters) => [...letters].reduce(advanceSpell, state);

test("normalises the target exactly as the server does", () => {
  assert.equal(normalizeTarget("  pagi "), "PAGI");
  assert.equal(normalizeTarget("selamat   pagi"), "SELAMAT PAGI");
  assert.equal(normalizeTarget(undefined), "");
});

test("completes a short word letter by letter", () => {
  let state = createSpellState("PAGI");
  assert.equal(expectedLetter(state), "P");

  state = advanceSpell(state, "P");
  assert.equal(state.outcome, "matched");
  assert.equal(expectedLetter(state), "A");

  state = sign(state, "AG");
  assert.equal(expectedLetter(state), "I");
  assert.equal(state.done, false);

  state = advanceSpell(state, "I");
  assert.equal(state.outcome, "complete");
  assert.equal(state.done, true);
  assert.equal(expectedLetter(state), null);
  assert.equal(spelledAnswer(state), "PAGI");
});

test("a wrong letter costs an attempt but never undoes progress", () => {
  // Aturan inti: 12 huruf tanpa satu pun keliru nyaris mustahil, jadi
  // kesalahan tidak boleh mengembalikan peserta ke awal.
  let state = sign(createSpellState("PAGI"), "PA");
  const before = state.matched;

  state = advanceSpell(state, "Z");
  assert.equal(state.outcome, "wrong");
  assert.equal(state.wrongLetter, "Z");
  assert.equal(state.matched, before, "progres tidak boleh mundur");
  assert.equal(expectedLetter(state), "G");

  state = advanceSpell(state, "G");
  assert.equal(state.outcome, "matched");
  assert.equal(state.matched, before + 1);
});

test("skips spaces so a phrase needs no space key", () => {
  let state = createSpellState("SELAMAT PAGI");
  state = sign(state, "SELAMAT");
  // Penunjuk sudah melompati spasi dan menunggu huruf berikutnya.
  assert.equal(expectedLetter(state), "P");
  assert.equal(state.done, false);

  state = sign(state, "PAGI");
  assert.equal(state.done, true);
  assert.equal(spelledAnswer(state), "SELAMAT PAGI");
});

test("handles a repeated letter within the word", () => {
  let state = createSpellState("SENIN");
  state = sign(state, "SENIN");
  assert.equal(state.done, true);
  assert.equal(spelledAnswer(state), "SENIN");
});

test("handles the same letter twice in a row", () => {
  let state = createSpellState("SAAT");
  state = sign(state, "SA");
  assert.equal(expectedLetter(state), "A");
  state = sign(state, "AT");
  assert.equal(state.done, true);
});

test("accepts lowercase recognition output", () => {
  const state = sign(createSpellState("IBU"), "ibu");
  assert.equal(state.done, true);
  assert.equal(spelledAnswer(state), "IBU");
});

test("ignores anything that is not a single A-Z letter", () => {
  const start = createSpellState("BUS");
  for (const junk of ["", " ", "AB", "1", "?", null, undefined, 7]) {
    const state = advanceSpell(start, junk);
    assert.equal(state.outcome, "ignored", `seharusnya diabaikan: ${String(junk)}`);
    assert.equal(state.matched, start.matched);
    assert.equal(state.attempts, start.attempts, "masukan tak sah tidak dihitung percobaan");
  }
});

test("stays finished once the word is complete", () => {
  let state = sign(createSpellState("IBU"), "IBU");
  const after = advanceSpell(state, "X");
  assert.equal(after.done, true);
  assert.equal(after.outcome, "ignored");
  assert.equal(spelledAnswer(after), "IBU");
});

test("an unfinished word submits nothing rather than a partial answer", () => {
  // Soal yang dilewati dinilai salah, tetapi kuisnya tetap dapat dikirim.
  const state = sign(createSpellState("APEL"), "AP");
  assert.equal(state.done, false);
  assert.equal(spelledAnswer(state), "");
});

test("an empty target never reports itself as done", () => {
  const state = createSpellState("");
  assert.equal(state.done, false);
  assert.equal(expectedLetter(state), null);
  assert.equal(advanceSpell(state, "A").outcome, "ignored");
});

test("describes each cell for the UI", () => {
  const state = sign(createSpellState("SELAMAT PAGI"), "SELAMAT");
  const cells = spellCells(state);
  assert.equal(cells.length, "SELAMAT PAGI".length);
  assert.deepEqual(
    cells.slice(0, 7).map((c) => c.status),
    Array(7).fill("done"),
  );
  assert.equal(cells[7].isSpace, true);
  assert.equal(cells[8].status, "current");
  assert.equal(cells[9].status, "pending");
});

test("records which letter the learner struggled with, not what was misread", () => {
  // Yang berguna bagi pemelajar adalah "huruf G masih sulit kamu bentuk",
  // bukan "kamera membaca Z".
  let state = createSpellState("PAGI");
  state = sign(state, "PA");
  state = advanceSpell(state, "Z");
  state = advanceSpell(state, "X");
  assert.deepEqual(spellMistakes(state), { G: 2 });

  state = advanceSpell(state, "G");
  assert.deepEqual(spellMistakes(state), { G: 2 }, "huruf benar tidak menambah catatan");

  state = advanceSpell(state, "Q");
  assert.deepEqual(spellMistakes(state), { G: 2, I: 1 });
});

test("ignored input never counts as a mistake", () => {
  let state = createSpellState("IBU");
  for (const junk of ["", "AB", "1", null]) state = advanceSpell(state, junk);
  assert.deepEqual(spellMistakes(state), {});
});
