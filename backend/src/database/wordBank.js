/**
 * Isi awal Bank Kata BISINDO.
 *
 * Tidak satu pun entri di sini membawa URL gambar atau video, dan itu
 * disengaja. Isyarat kata utuh dalam BISINDO belum kita punya rekamannya, dan
 * menaruh tautan asal-asalan persis itulah yang merusak satu-satunya baris yang
 * sebelumnya ada. Sebagai gantinya setiap kata menyimpan bentuk ejaannya —
 * "Halo" menjadi "H-A-L-O" — sehingga sisi tampilan dapat merangkainya dari 26
 * gambar abjad yang sudah kita punya. Tidak ada berkas yang hilang, tidak ada
 * gambar rusak, dan kamusnya berguna sejak hari pertama.
 *
 * Abjadnya sendiri TIDAK ada di sini. Abjad adalah bagian tetap dari bahasa,
 * bukan konten yang dikelola: kalau ia jadi 26 baris basis data, satu klik
 * hapus yang salah sasaran membuat huruf "K" lenyap dan penerjemah berhenti
 * bisa mengeja. Abjad hidup sebagai aset yang ikut dikompilasi.
 */

/** Menyusun bentuk ejaan yang ditampilkan, "Selamat pagi" -> "S-E-L-A-M-A-T P-A-G-I". */
export function spellOut(word) {
  return String(word)
    .toUpperCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.split("").filter((c) => /[A-Z]/.test(c)).join("-"))
    .filter(Boolean)
    .join(" ");
}

const GROUPS = {
  Sapaan: [
    ["Halo", "Sapaan paling umum saat bertemu teman baru.", ["hai", "hallo"]],
    ["Selamat pagi", "Dipakai dari matahari terbit sampai sekitar pukul sebelas.", ["pagi"]],
    ["Selamat siang", "Dipakai sekitar pukul sebelas sampai tiga sore.", ["siang"]],
    ["Selamat sore", "Dipakai sekitar pukul tiga sampai matahari terbenam.", ["sore"]],
    ["Selamat malam", "Dipakai setelah matahari terbenam.", ["malam"]],
    ["Terima kasih", "Diucapkan saat menerima bantuan atau pemberian.", ["makasih", "terimakasih"]],
    ["Maaf", "Diucapkan saat melakukan kesalahan.", ["sori"]],
    ["Tolong", "Diucapkan saat meminta bantuan.", []],
    ["Sampai jumpa", "Diucapkan saat berpisah.", ["dadah", "bye"]],
  ],
  Keluarga: [
    ["Ayah", "Orang tua laki-laki.", ["bapak", "papa"]],
    ["Ibu", "Orang tua perempuan.", ["mama", "bunda"]],
    ["Kakak", "Saudara yang lebih tua.", ["abang", "mbak"]],
    ["Adik", "Saudara yang lebih muda.", []],
    ["Kakek", "Ayah dari orang tua kita.", []],
    ["Nenek", "Ibu dari orang tua kita.", []],
    ["Keluarga", "Orang-orang terdekat di rumah.", []],
  ],
  Sekolah: [
    ["Sekolah", "Tempat belajar bersama guru dan teman.", []],
    ["Guru", "Orang yang mengajar di sekolah.", ["bu guru", "pak guru"]],
    ["Teman", "Orang yang bermain dan belajar bersama kita.", ["sahabat", "kawan"]],
    ["Buku", "Alat untuk membaca dan menulis pelajaran.", []],
    ["Belajar", "Kegiatan menambah pengetahuan baru.", []],
    ["Membaca", "Kegiatan mengenali dan memahami tulisan.", ["baca"]],
    ["Menulis", "Kegiatan membuat huruf dan kata.", ["tulis"]],
  ],
  Perasaan: [
    ["Senang", "Perasaan saat sesuatu yang baik terjadi.", ["gembira", "bahagia"]],
    ["Sedih", "Perasaan saat sesuatu yang tidak menyenangkan terjadi.", []],
    ["Marah", "Perasaan saat merasa diperlakukan tidak adil.", []],
    ["Takut", "Perasaan saat menghadapi sesuatu yang menakutkan.", []],
    ["Sayang", "Perasaan hangat kepada orang terdekat.", ["cinta"]],
  ],
  "Kegiatan Harian": [
    ["Makan", "Kegiatan menyantap makanan.", []],
    ["Minum", "Kegiatan meneguk air atau minuman lain.", []],
    ["Tidur", "Kegiatan beristirahat di malam hari.", []],
    ["Mandi", "Kegiatan membersihkan badan.", []],
    ["Bermain", "Kegiatan bersenang-senang bersama teman.", ["main"]],
  ],
};

/**
 * Entri siap simpan.
 *
 * @returns {{word: string, translation: string, description: string,
 *            category: string, aliases: string[]}[]}
 */
export const WORD_BANK = Object.entries(GROUPS).flatMap(([category, entries]) =>
  entries.map(([word, description, aliases]) => ({
    word,
    translation: spellOut(word),
    description,
    category,
    aliases,
  })),
);
