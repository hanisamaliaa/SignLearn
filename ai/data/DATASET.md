# Dataset training BISINDO A-Z

Data mentah, sequence landmark, split manifest, dan feature cache sengaja tidak
disimpan di Git. Repository hanya menyimpan downloader, pipeline training,
artifact produksi, dan laporan evaluasi.

## Sumber data

| Sumber | Lisensi | Pemakaian |
| --- | --- | --- |
| [Mendeley BISINDO](https://data.mendeley.com/datasets/4xnkvr88tk/1), DOI `10.17632/4xnkvr88tk.1` | CC BY 4.0 | Dataset utama dan signer/capture group holdout |
| Kaggle [`achmadnoer/alfabet-bisindo`](https://www.kaggle.com/datasets/achmadnoer/alfabet-bisindo) | CC0 Public Domain | Auxiliary training-only images, 312 gambar (12 x 26 kelas) |
| Kaggle [`niputukarismadewi/talkee-bisindo-sign-language-dataset`](https://www.kaggle.com/datasets/niputukarismadewi/talkee-bisindo-sign-language-dataset) | CC0 | Auxiliary MediaPipe landmark sequence; hanya A-Z |

Talkee juga memuat tujuh kelas kata. Pipeline produksi secara eksplisit membaca
direktori `A` sampai `Z`, sehingga kelas kata tidak pernah masuk ke model.

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

Mendeley menjadi sumber evaluasi utama. Suffix filename dipakai sebagai
capture/signer group dan kelompok lengkap ditahan untuk validation serta test.
Frame yang berdekatan dari capture yang sama tidak diacak ke beberapa split.

Dataset Achmad dan Talkee hanya ditambahkan ke training. Keduanya tidak dipakai
untuk memilih threshold atau menghitung frozen signer-test metric.

Setelah hyperparameter dan threshold dibekukan serta test selesai, artifact
deployment di-refit dengan seluruh partisipan publik. Oleh karena itu, metrik
independen di `../reports/production_v5.json` adalah milik evaluation model,
bukan evaluasi ulang atas final-refit bundle.

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
