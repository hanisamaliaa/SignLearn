/**
 * Penyusunan isi Kamus BISINDO.
 *
 * Kamus menampilkan dua sumber yang sifatnya berbeda, dan perbedaan itu
 * disengaja:
 *
 *   Abjad — 26 huruf, ikut dikompilasi sebagai aset. Selalu ada, tidak butuh
 *           jaringan, dan tidak dapat dihapus dari dasbor admin. Abjad adalah
 *           bagian tetap dari bahasa; kalau ia berupa baris basis data, satu
 *           klik hapus yang salah membuat huruf "K" lenyap dan penerjemah
 *           berhenti bisa mengeja.
 *
 *   Kata  — dikelola admin lewat Bank Kata, datang dari API. Boleh kosong,
 *           boleh berubah, dan kamus tetap berguna tanpanya.
 *
 * Modul ini murni: tidak mengimpor aset dan tidak menyentuh jaringan, sehingga
 * seluruh aturan penyusunannya dapat diuji dengan `node --test`.
 */

export const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/**
 * Huruf yang cocok dengan pencarian.
 *
 * Pencarian "ak" mengembalikan A dan K, bukan tidak ada apa-apa: yang diketik
 * orang di kamus abjad umumnya kata yang ingin mereka eja, bukan satu huruf.
 * Menampilkan huruf penyusunnya jauh lebih berguna daripada hasil kosong.
 */
export function matchLetters(query) {
  const cleaned = String(query ?? "").trim().toUpperCase();
  if (!cleaned) return LETTERS;

  const wanted = new Set(cleaned.split("").filter((char) => /[A-Z]/.test(char)));
  if (!wanted.size) return [];
  return LETTERS.filter((letter) => wanted.has(letter));
}

/**
 * Mengelompokkan kata menurut kategori.
 *
 * Kategori diurutkan menurut abjad dan katanya menurut abjad pula, sehingga
 * memuat ulang halaman tidak pernah mengubah urutan. Urutan yang berubah-ubah
 * membuat orang kehilangan tempat setiap kali menutup dan membuka kamus.
 *
 * @returns {{ category: string, items: object[] }[]}
 */
export function groupByCategory(items = []) {
  const groups = new Map();
  for (const item of items) {
    const category = item?.category?.trim() || "Umum";
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(item);
  }

  return [...groups.entries()]
    .map(([category, entries]) => ({
      category,
      items: entries.slice().sort((a, b) =>
        String(a.word).localeCompare(String(b.word), "id-ID")),
    }))
    .sort((a, b) => a.category.localeCompare(b.category, "id-ID"));
}

/**
 * Ringkasan untuk kepala halaman.
 *
 * Jumlah huruf ditulis sebagai konstanta 26, bukan dihitung dari daftar hasil
 * pencarian: yang ingin diketahui orang adalah seberapa lengkap kamusnya,
 * bukan berapa banyak yang lolos filter saat itu.
 */
export function summarise(words = []) {
  return {
    letters: LETTERS.length,
    words: words.length,
    categories: new Set(words.map((item) => item?.category?.trim() || "Umum")).size,
  };
}
