# Kursus berbasis video dan kuis kamera BISINDO

Tanggal: 2026-08-17

## Masalah

Inti produk belum bisa dilihat. `Lesson.jsx` merender player palsu — sebuah
`<div>` dengan tombol play dan animasi batang memantul — dan tidak pernah
membaca `videoUrl`, padahal backend sudah mendukungnya penuh. Kosakata, tujuan
belajar, dan grid huruf pada halaman itu hardcoded tentang abjad, sehingga
muncul sama persis di pelajaran apa pun. Halaman juga tidak pernah memanggil
`completeLesson`, jadi tidak ada cara menandai pelajaran selesai.

Database berisi 3 kursus tanpa video, 2 kursus sisa E2E, 4 pelajaran duplikat
dengan video palsu, dan `total_lessons` yang tidak sesuai jumlah baris.

## Keputusan

1. **Ganti total** isi kursus. Seluruh progres yang ada milik akun test, tidak
   ada data belajar sungguhan yang hilang.
2. **10 kursus, 1 pelajaran masing-masing**, dari seri "Belajar bahasa Isyarat
   BISINDO #1-#10" oleh Okke Hidayah Kahfi. Skema sudah mendukung banyak
   pelajaran per kursus; isinya saja yang satu-satu untuk sekarang.
3. **Player: facade lalu IFrame API.** Thumbnail dulu (ringan, tanpa cookie
   YouTube), player asli saat diklik, selesai otomatis saat video habis.
4. **Buang konten fiktif.** Deskripsi isyarat yang tidak bisa diverifikasi
   lebih berbahaya daripada halaman yang lebih sepi, karena mengajarkan isyarat
   yang salah.
5. **Tematik, semua terbuka.** Tiap kursus berdiri sendiri; tidak ada alasan
   mengunci "Buah" karena "Abjad" belum ditonton.
6. **Kuis kamera menguji ejaan, bukan isyarat kata.** Model hanya mengenali 26
   huruf statis. Perintah soal berbunyi "Eja kata ini dengan abjad BISINDO"
   supaya aplikasi tidak menjanjikan penilaian yang tidak bisa dilakukannya.

## Konten

| # | Kursus | Kategori | Level | Target kuis |
|---|---|---|---|---|
| 1 | Abjad BISINDO | Dasar | Pemula | ABJAD |
| 2 | Kata Sapa | Dasar | Pemula | PAGI |
| 3 | Kata Sifat | Kosakata | Menengah | BAIK |
| 4 | Keluarga | Kosakata | Pemula | IBU |
| 5 | Transportasi | Kosakata | Menengah | BUS |
| 6 | Profesi | Kosakata | Menengah | GURU |
| 7 | Hari | Dasar | Pemula | SENIN |
| 8 | Angka | Dasar | Pemula | SATU |
| 9 | Olahraga | Kosakata | Menengah | BOLA |
| 10 | Buah-buahan | Kosakata | Pemula | APEL |

`sort_order` mengikuti urutan seri. `duration` dibiarkan NULL — diisi player
saat runtime karena durasi asli tidak bisa diambil tanpa API key, dan
mengarangnya berarti berbohong kepada pemelajar. Deskripsi kursus Abjad menyebut
bahwa videonya varian Yogyakarta.

## Player

`frontend/src/components/lesson/YouTubeLesson.jsx`, dengan `parseYouTubeId()`
sebagai fungsi murni terpisah agar dapat diuji.

```
idle    -> thumbnail + tombol play
klik    -> muat IFrame API sekali (singleton)
playing -> laporkan durasi sebenarnya
ENDED   -> completeLesson(), idempoten, sekali saja
```

Jalur mundur, karena ini bergantung pihak ketiga:

- Skrip gagal dimuat dalam 5 detik -> `<iframe>` biasa + tombol manual.
- Error player 101/150 (embed dimatikan) -> tautan "Tonton di YouTube".
- `maxresdefault.jpg` tidak ada -> `onError` turun ke `hqdefault.jpg`.

## Kuis kamera

Skema: tambah `answer_text` pada `quiz_questions`, izinkan
`question_type = 'camera-spell'`.

```
multiple-choice -> dinilai dari correct_index
camera-spell    -> dinilai dari answer_text
```

Kontrak submit diperluas menjadi `{questionId, selectedIndex?, answerText?}`.
Penilaian tetap sepenuhnya di server; klien mengirim huruf yang dikenali dan
tidak pernah menyatakan benar atau salah. Soal kamera dinilai biner sehingga
rumus `correctCount / totalQuestions` tidak berubah.

Alur, memakai ulang `useBisindoRecognition` dan `PredictionStabilizer`:

```
huruf cocok target[matched] -> matched++, kotak hijau
huruf tidak cocok           -> removeLast(), "coba lagi"
target[i] == spasi          -> dilewati otomatis
matched == panjang          -> soal selesai
```

Aturan spasi otomatis membuat target berspasi seperti "SELAMAT PAGI" tetap
bisa dipakai tanpa user menekan tombol spasi.

Soal disusun manual di admin dengan validasi target hanya A-Z dan spasi, di
klien untuk umpan balik dan di server sebagai penentu. Angka dan tanda baca
tidak bisa diperagakan model, jadi membiarkannya masuk berarti membuat soal
yang mustahil diselesaikan.

## Jalan keluar saat kamera bermasalah

Izin kamera ditolak atau layanan AI mati akan mengunci user dari seluruh
kursus. Karena itu keduanya menampilkan pesan jelas plus "Lewati soal ini"
yang dinilai 0 tetapi membuat kuis tetap dapat dikirim. `duration_seconds`
dinaikkan karena memeragakan huruf jauh lebih lambat daripada mengklik.

## Batasan yang diakui

- Kuis menguji ejaan abjad, bukan isyarat kata yang diajarkan video.
- Hasil kenalan dikirim dari browser sehingga dapat dimanipulasi lewat
  DevTools. Wajar untuk aplikasi belajar, tidak layak untuk penilaian resmi.
- Verifikasi frame di server akan menutup celah itu; di luar cakupan ini.

## Di luar cakupan

Tabel kosakata, fitur catatan yang benar-benar menyimpan, soal pilihan ganda
untuk isi video, dan kolam kata untuk soal acak.
