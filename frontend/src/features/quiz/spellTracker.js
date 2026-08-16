/**
 * Pelacak progres mengeja untuk soal kuis berkamera.
 *
 * Ditulis sebagai reducer murni, terpisah dari komponen dan dari pengenalan
 * kamera. Alasannya bukan kerapian: aturan di sinilah yang menentukan kuis
 * terasa adil atau menyiksa, dan aturan itu harus dapat diuji tanpa webcam,
 * tanpa layanan AI, dan tanpa menunggu satu detik pun.
 *
 * Keputusan yang membentuknya:
 *
 * · Huruf salah TIDAK memundurkan progres. Mengeja 12 huruf tanpa satu pun
 *   keliru nyaris mustahil; menghukum kesalahan dengan mengulang dari awal
 *   akan membuat soal panjang tidak pernah selesai.
 *
 * · Spasi dilewati otomatis. Target seperti "SELAMAT PAGI" karenanya dapat
 *   dikerjakan tanpa peserta perlu tahu bahwa ada tombol spasi.
 */

/** Bentuk baku target; harus sama dengan normalizeSpellTarget di server. */
export function normalizeTarget(value) {
  if (typeof value !== "string") return "";
  return value.trim().toUpperCase().replace(/\s+/g, " ");
}

/** Melompati spasi agar penunjuk selalu berhenti di huruf yang harus diperagakan. */
function skipSpaces(target, index) {
  let next = index;
  while (next < target.length && target[next] === " ") next += 1;
  return next;
}

export function createSpellState(rawTarget) {
  const target = normalizeTarget(rawTarget);
  const matched = skipSpaces(target, 0);
  return {
    target,
    matched,
    done: target.length === 0 ? false : matched >= target.length,
    outcome: "idle",
    wrongLetter: null,
    attempts: 0,
    // Huruf apa yang keliru diperagakan, dan berapa kali. Dipakai dashboard
    // untuk menunjukkan huruf mana yang masih perlu dilatih. Ini telemetri
    // belajar, bukan bahan penilaian — server tidak memakainya untuk menskor.
    mistakes: {},
  };
}

/**
 * Menerima satu huruf hasil pengenalan.
 *
 * @returns {object} state baru; `outcome` berisi "matched", "wrong",
 *   "complete", atau "ignored" untuk masukan yang bukan huruf tunggal.
 */
export function advanceSpell(state, rawLetter) {
  if (state.done) return { ...state, outcome: "ignored", wrongLetter: null };

  const letter = typeof rawLetter === "string" ? rawLetter.trim().toUpperCase() : "";
  if (letter.length !== 1 || !/^[A-Z]$/.test(letter)) {
    return { ...state, outcome: "ignored", wrongLetter: null };
  }
  if (!state.target) {
    return { ...state, outcome: "ignored", wrongLetter: null };
  }

  const attempts = state.attempts + 1;

  if (letter !== state.target[state.matched]) {
    // Dicatat huruf yang SEHARUSNYA diperagakan, bukan yang terbaca: yang
    // berguna bagi pemelajar adalah "huruf G masih sulit kamu bentuk".
    const expected = state.target[state.matched];
    return {
      ...state,
      outcome: "wrong",
      wrongLetter: letter,
      attempts,
      mistakes: { ...state.mistakes, [expected]: (state.mistakes[expected] ?? 0) + 1 },
    };
  }

  const matched = skipSpaces(state.target, state.matched + 1);
  const done = matched >= state.target.length;
  return {
    ...state,
    matched,
    done,
    outcome: done ? "complete" : "matched",
    wrongLetter: null,
    attempts,
  };
}

/** Huruf yang sedang ditunggu, atau null bila sudah selesai. */
export function expectedLetter(state) {
  return state.done ? null : (state.target[state.matched] ?? null);
}

/**
 * Jawaban yang dikirim ke server.
 *
 * Hanya bagian yang benar-benar berhasil diperagakan. Soal yang dilewati
 * mengirim teks kosong dan dinilai salah, bukan menggagalkan pengiriman kuis.
 */
export function spelledAnswer(state) {
  return state.done ? state.target : "";
}

/** Huruf yang sempat keliru, untuk dikirim bersama jawaban. */
export function spellMistakes(state) {
  return { ...state.mistakes };
}

/** Bentuk untuk UI: tiap huruf beserta statusnya. */
export function spellCells(state) {
  return [...state.target].map((char, index) => ({
    char,
    isSpace: char === " ",
    status:
      index < state.matched ? "done" : index === state.matched ? "current" : "pending",
  }));
}
