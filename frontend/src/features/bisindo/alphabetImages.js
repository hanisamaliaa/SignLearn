/**
 * Peta huruf A-Z ke gambar isyarat BISINDO-nya.
 *
 * Arahnya kebalikan dari `PredictionStabilizer`: modul itu mengubah kamera
 * menjadi huruf, modul ini mengubah huruf menjadi gambar. Kamus dan penerjemah
 * teks sama-sama memakainya.
 *
 * Gambarnya dipetakan lewat `import.meta.glob` alih-alih 26 baris `import`.
 * Bukan sekadar lebih ringkas: menyusun jalur secara manual — misalnya
 * `` `/src/assets/bisindo/${huruf}.webp` `` — akan lolos saat `npm run dev`
 * lalu rusak setelah `vite build`, karena berkas produksi memakai nama ber-hash
 * yang hanya diketahui Vite jika ia melihat rujukannya saat kompilasi.
 */

const files = import.meta.glob([
  "../../assets/bisindo/*.webp",
  "!../../assets/bisindo/contact-sheet.webp",
], {
  eager: true,
  query: "?url",
  import: "default",
});

export const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const byLetter = Object.fromEntries(
  Object.entries(files).map(([path, url]) => [
    path.slice(path.lastIndexOf("/") + 1, -".webp".length).toUpperCase(),
    url,
  ]),
);

/**
 * Gambar untuk satu huruf, atau `null` bila bukan A-Z.
 *
 * Mengembalikan `null` dan bukan gambar pengganti: pemanggil di penerjemah
 * perlu membedakan "huruf ini tidak punya isyarat" dari "ini isyaratnya",
 * karena keduanya ditampilkan berbeda — yang pertama dilewati, bukan
 * ditampilkan sebagai kotak kosong.
 */
export function letterImage(char) {
  if (typeof char !== "string" || char.length !== 1) return null;
  return byLetter[char.toUpperCase()] ?? null;
}

/** Benar bila setiap huruf punya gambar. Dipakai pengujian asap saat memuat. */
export function isAlphabetComplete() {
  return LETTERS.every((letter) => Boolean(byLetter[letter]));
}
