/**
 * Mengeja kalimat menjadi urutan huruf BISINDO.
 *
 * BISINDO yang kita punya baru sebatas abjad, jadi "aku mau makan" diperagakan
 * sebagai A-K-U, M-A-U, M-A-K-A-N — bukan tiga isyarat kata. Pemisahan per kata
 * dipertahankan karena itulah yang membuat hasilnya terbaca; deretan
 * AKUMAUMAKAN tanpa jeda tidak berarti apa-apa bagi anak.
 *
 * ── Mengapa modul ini tidak menyentuh gambar ──────────────────────────
 *
 * Pemetaan huruf ke berkas gambar ada di `alphabetImages.js`, yang memakai
 * `import.meta.glob` dan karenanya hanya dapat dijalankan oleh Vite. Bila modul
 * ini mengimpornya, seluruh logika ejaan — bagian yang justru paling perlu
 * diuji — menjadi mustahil diuji dengan `node --test`. Jadi di sini hurufnya
 * saja; pemanggil yang menyambungkannya ke gambar.
 *
 * "Huruf mana yang punya isyarat" pun bukan urusan berkas melainkan urusan
 * bahasa: BISINDO punya isyarat untuk A-Z, titik. `isAlphabetComplete()` yang
 * menjaga bahwa berkasnya benar-benar ada.
 *
 * ── Karakter tanpa isyarat ────────────────────────────────────────────
 *
 * Angka, tanda baca, dan emoji tidak punya isyarat abjad. Semuanya DILAPORKAN,
 * bukan dibuang diam-diam: anak yang mengetik "aku 5 tahun" berhak tahu bahwa
 * "5" sengaja dilewati. Membuangnya tanpa kabar membuat hasilnya tampak seperti
 * kesalahan aplikasi.
 */

/** Batas yang sama dengan `maxLength` kotak teks penerjemah. */
export const MAX_PHRASE_LENGTH = 140;

const SIGNABLE = /^[A-Z]$/;

/**
 * Membuang tanda diakritik lalu menjadikan huruf besar.
 *
 * NFD memecah "é" menjadi "e" ditambah tanda aksen sebagai dua titik kode
 * terpisah, sehingga tandanya dapat dihapus lewat rentang U+0300-U+036F dan
 * huruf dasarnya tetap utuh. Menolak huruf beraksen hanya akan membingungkan:
 * bentuk tangannya memang sama dengan huruf dasarnya.
 */
function flatten(text) {
  return String(text ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase();
}

/**
 * @typedef {{ text: string, letters: string[] }} SpelledWord
 *
 * @param {string} text Kalimat dari ketikan atau hasil pengenalan suara.
 * @returns {{
 *   words: SpelledWord[],
 *   letterCount: number,
 *   skipped: string[],
 *   isEmpty: boolean,
 * }}
 */
export function spellPhrase(text) {
  const flattened = flatten(text).slice(0, MAX_PHRASE_LENGTH);
  const skipped = [];
  const words = [];

  // Dipisah pada spasi apa pun: spasi ganda, tab, dan baris baru sama saja.
  for (const chunk of flattened.split(/\s+/)) {
    if (!chunk) continue;

    const letters = [];
    for (const char of chunk) {
      if (SIGNABLE.test(char)) letters.push(char);
      else if (!skipped.includes(char)) skipped.push(char);
    }

    // Kata yang seluruhnya tanpa isyarat — misalnya "123" — tidak menghasilkan
    // kotak kosong; keberadaannya sudah tercatat di `skipped`.
    if (letters.length) words.push({ text: chunk, letters });
  }

  return {
    words,
    letterCount: words.reduce((sum, word) => sum + word.letters.length, 0),
    skipped,
    isEmpty: words.length === 0,
  };
}

/** Bentuk ringkas untuk API/admin: "AKU MAU" menjadi "A-K-U M-A-U". */
export function toSpellingText(text) {
  return spellPhrase(text).words
    .map((word) => word.letters.join("-"))
    .join(" ");
}

/**
 * Kalimat penjelasan untuk karakter yang dilewati, atau string kosong.
 *
 * Ditaruh di sini, bukan di komponen, supaya kalimatnya ikut teruji:
 * penggabungan daftar dan bentuk jamak mudah salah dan jarang terlihat.
 */
export function describeSkipped(skipped) {
  if (!skipped?.length) return "";
  const shown = skipped.slice(0, 6).join(" ");
  const rest = skipped.length - 6;
  const tail = rest > 0 ? ` dan ${rest} karakter lain` : "";
  return `BISINDO di sini baru mencakup huruf A-Z, jadi ${shown}${tail} dilewati.`;
}
