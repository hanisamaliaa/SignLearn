# Artifact model BISINDO

Folder ini menyimpan artifact yang dibutuhkan layanan inferensi. Dataset mentah,
feature cache, dan model kandidat tidak disimpan di Git.

## Model produksi

`bisindo_geometry_v5.pkl` adalah bundle default untuk pengenalan alfabet
BISINDO A-Z. Bundle joblib tersebut memuat:

- calibrated RBF SVM 26 kelas;
- urutan kelas tepat `A` sampai `Z`;
- versi feature schema `bisindo-geometry-v5`;
- jumlah fitur `1.179`;
- rejection threshold confidence `0.93` dan margin `0.02`;
- versi model serta sumber training.

Identitas artifact yang di-commit:

| Properti | Nilai |
| --- | --- |
| Ukuran | 35.124.472 byte (sekitar 33,5 MiB) |
| SHA-256 | `6fac6ef36d6258c9f46ca3d4a5b11b5e061bfa4a1e8199e431e78b9ede6e7910` |
| Model version | `5.0.0-2026-08-14` |

Runtime memverifikasi feature schema, feature count, dan kelas A-Z saat startup.
Jika kontraknya berbeda dari kode `app/landmarks.py`, service sengaja gagal
start agar tidak menghasilkan prediksi dari preprocessing yang salah.

Metadata ringkas tersedia di `model_metadata.json`; audit lengkap berada di
`../reports/production_v5.json` dan `../MODEL_RESEARCH.md`.

## Sumber training

- [Mendeley BISINDO dataset](https://data.mendeley.com/datasets/4xnkvr88tk/1),
  Arya Raden dan Muhammad Asshafi, DOI `10.17632/4xnkvr88tk.1`, CC BY 4.0.
- Kaggle [`achmadnoer/alfabet-bisindo`](https://www.kaggle.com/datasets/achmadnoer/alfabet-bisindo),
  CC0 Public Domain.
- Kaggle [`niputukarismadewi/talkee-bisindo-sign-language-dataset`](https://www.kaggle.com/datasets/niputukarismadewi/talkee-bisindo-sign-language-dataset),
  CC0. Pipeline hanya membaca kelas A-Z.

## Model legacy

`rf_bisindo_99.pkl` dipertahankan hanya sebagai rollback eksplisit. Angka 99%
historisnya berasal dari augmented random split yang kecil. Ketika diuji dengan
protokol signer-group holdout v5, raw accuracy-nya hanya `5,97%`; karena itu
model tersebut bukan default dan tidak direkomendasikan untuk deployment.

Untuk mengaktifkannya secara eksplisit, `BISINDO_MODEL_PATH` dapat diarahkan ke
file legacy. Jalur ini hanya untuk investigasi/rollback dan tidak mempunyai
rejection calibration yang setara dengan v5.

## Mengganti artifact

Jangan mengganti file produksi hanya berdasarkan validation accuracy. Artifact
baru harus memenuhi seluruh kontrak berikut:

1. tepat 26 kelas dengan urutan `A-Z`;
2. preprocessing yang terdokumentasi dan identik di training/runtime;
3. evaluasi dengan signer/capture group holdout;
4. probability calibration dan rejection threshold yang dibekukan sebelum test;
5. report, checksum, versi, lisensi sumber, dan test runtime diperbarui bersama;
6. frontend stabilizer diuji kembali terhadap response model baru.

Perintah training dan prosedur evaluasi dijelaskan di [`../README.md`](../README.md).
