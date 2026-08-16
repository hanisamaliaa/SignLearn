# Dataset training BISINDO A-Z

Data mentah, sequence landmark, split manifest, dan feature cache sengaja tidak
disimpan di Git. Repository hanya menyimpan downloader, pipeline training,
artifact produksi, dan laporan evaluasi.

## Sumber data

| Sumber | Lisensi | Kamera | Peran |
| --- | --- | --- | --- |
| Kaggle [`niputukarismadewi/talkee-bisindo-sign-language-dataset`](https://www.kaggle.com/datasets/niputukarismadewi/talkee-bisindo-sign-language-dataset) | CC0 | landmark, aspect ~16:9 | **Korpus utama.** Domain paling dekat webcam |
| Kaggle [`achmadnoer/alfabet-bisindo`](https://www.kaggle.com/datasets/achmadnoer/alfabet-bisindo) | CC0 Public Domain | persegi 1:1, close-up | Ragam close-up, 312 gambar (12 x 26) |
| [Mendeley BISINDO](https://data.mendeley.com/datasets/4xnkvr88tk/1), DOI `10.17632/4xnkvr88tk.1` | CC BY 4.0 | fisheye 640x480, penanda jauh | Ragam signer; stress test out-of-domain |

Talkee juga memuat tujuh kelas kata. Pipeline produksi secara eksplisit membaca
direktori `A` sampai `Z`, sehingga kelas kata tidak pernah masuk ke model.

### Kenapa Talkee menjadi korpus utama

Mendeley sempat menjadi sumber utama dan itu penyebab langsung model v5 hanya
menguasai 18 huruf. Rekamannya memakai kamera fisheye dengan penanda duduk jauh:
tangan hanya menempati 13,8% lebar frame (median), dibanding 33,7% pada Talkee.
Pada ukuran sekecil itu MediaPipe sering **hanya menemukan satu tangan** untuk
huruf dua tangan.

Rasio sampel yang jumlah tangannya cocok dengan hurufnya:

| Korpus | Konsisten |
| --- | ---: |
| Talkee | 99,1% |
| Kaggle | 68,7% |
| Mendeley | 61,7% |

Sampel yang tidak konsisten bukan variasi sah: ketika satu tangan hilang, 504
dari 1.179 fitur (`cross_distances` + `pair`) serentak menjadi nol sementara
labelnya tetap huruf penuh. Sekitar 57% data latih "P" dahulu berupa artefak
satu tangan, sehingga kelas P runtuh seluruhnya ke Q pada signer baru.

### Aspect ratio per korpus

MediaPipe membagi `x` dengan lebar dan `y` dengan tinggi, jadi frame non-persegi
meregangkan tangan. Pipeline mengubah landmark ke satuan isotropik (fraksi lebar
frame) saat pemuatan. Korpus gambar memakai dimensi file yang sebenarnya; Talkee
hanya berisi landmark sehingga aspect-nya direkonstruksi dari data: rasio lebar
telapak terhadap panjang telunjuk yang seharusnya konstan secara anatomis
terbaca 0,807 (Kaggle 1:1), 0,723 (Mendeley 4:3), dan 0,662 (Talkee), dan 16:9
adalah nilai yang memaksimalkan transfer Talkee ke kedua korpus lain.

## Download

Jalankan dari root repository:

```bash
npm run ai:download
npm run ai:download:mendeley
npm run ai:download:talkee
```

Downloader Mendeley memverifikasi checksum archive yang sudah dibekukan.
Downloader Kaggle generik mencetak SHA-256 archive setelah download dan
melakukan safe extraction untuk mencegah path traversal.

Struktur lokal yang diharapkan:

```text
ai/data/
|-- raw/
|   |-- Citra BISINDO/
|   |   |-- A/
|   |   `-- ... Z/
|   |-- mendeley_bisindo_v1/
|   |   `-- BISINDO DATASET/Mendeley BISINDO/A ... Z/
|   `-- talkee_bisindo/
|       `-- dt-final-100seq/A ... Z/
|-- cache/              # geometry features, generated
`-- splits/             # local manifests dengan machine-specific paths
```

Semua isi `raw/`, `cache/`, dan manifest JSON di `splits/` diabaikan Git.

## Split dan pencegahan leakage

Tidak ada split yang memotong bagian dalam satu sesi rekaman. Frame berdekatan
dari sesi yang sama nyaris identik; mengacaknya ke dua sisi akan membuat angka
evaluasi terlihat bagus tanpa membuktikan apa pun.

| Korpus | Unit yang ditahan | Train | Validation | Test |
| --- | --- | --- | --- | --- |
| Talkee | sequence utuh | seq 1-80 | seq 81-85 | seq 86-100 |
| Mendeley | capture/signer group utuh | BASE + AR | group 2 | group 3 |
| Kaggle | gambar, rotasi deterministik per kelas | 2 dari 3 | — | 1 dari 3 |

Talkee memakai frame yang sudah mapan (13, 16, 19, 22, 25, 28) karena awal
sequence masih berisi tangan yang bergerak menuju posisi: akurasi pada sequence
held-out naik monoton dari 96,3% di frame 2 ke 99,5% di frame 26.

### Higienis jumlah tangan: hanya untuk data latih

Sampel yang jumlah tangannya bertentangan dengan hurufnya dibuang **dari data
latih saja**. Val dan test dinilai utuh, termasuk frame tempat MediaPipe
kehilangan satu tangan, karena di aplikasi frame seperti itu tetap sampai ke
model dan tetap menampilkan huruf kepada pengguna. Menyaringnya dari evaluasi
akan mengukur dunia yang tidak dialami pengguna.

Laporan memisahkan keduanya lewat `accuracy_when_hands_seen` dan
`accuracy_when_a_hand_was_missed`, sehingga kesalahan classifier dapat dibedakan
dari kegagalan deteksi.

### Model yang dikirim tidak pernah melihat data ujinya

Pipeline v5 melakukan refit pada train+val+test sebelum menyimpan artifact,
sehingga angka yang dipublikasikan menggambarkan model yang tidak pernah
di-deploy. Pipeline v6 menyimpan persis estimator yang dievaluasi
(`refit_on_evaluation_data: false`, diverifikasi oleh test suite).

## Feature cache

Ekstraksi MediaPipe adalah tahap training yang paling mahal. Pipeline menyimpan
cache `.npz` agar eksperimen SVM berikutnya dapat memakai fitur yang sama tanpa
mendeteksi tangan ulang. Gunakan flag `--rebuild-cache` ketika:

- implementasi landmark/geometry berubah;
- feature schema berubah;
- dataset mentah berubah; atau
- cache dicurigai tidak sesuai dengan kode.

Jangan menggunakan cache lama setelah perubahan feature schema.

## Training

```bash
npm run ai:train:production
```

Perintah ini menulis:

```text
ai/models/bisindo_geometry_v5.pkl
ai/reports/production_v5.json
```

Perintah tersebut menimpa artifact default. Untuk eksperimen, jalankan module
`ai.training.train_production` secara langsung dengan `--output` dan `--report`
yang berbeda. Penjelasan lengkap tersedia di [`../README.md`](../README.md).

## Kepatuhan data

- Pertahankan atribusi Mendeley saat mendistribusikan turunan model/dokumentasi.
- Verifikasi kembali halaman sumber sebelum redistribusi dataset mentah.
- Jangan menambahkan rekaman kamera pengguna ke dataset tanpa persetujuan
  eksplisit dan kebijakan retensi/penghapusan.
- Pisahkan data evaluasi lapangan dari training agar metrik deployment tetap
  dapat dipercaya.
