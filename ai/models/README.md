# Artifact model BISINDO

Folder ini menyimpan artifact yang dibutuhkan layanan inferensi. Dataset mentah,
feature cache, dan model kandidat tidak disimpan di Git.

## Model produksi

`bisindo_geometry_v6.pkl` adalah bundle default untuk pengenalan alfabet BISINDO
A-Z. Bundle joblib tersebut memuat:

- calibrated RBF SVM 26 kelas (`C=10`, Platt scaling);
- urutan kelas tepat `A` sampai `Z`;
- versi feature schema `bisindo-geometry-v6`;
- jumlah fitur `1.179`;
- acceptance policy confidence `0.68` dan margin `0.0`;
- `refit_on_evaluation_data: false`.

Identitas artifact tercatat di [`model_metadata.json`](model_metadata.json) dan
audit lengkapnya di [`../reports/production_v6.json`](../reports/production_v6.json).
Test suite memverifikasi bahwa checksum artifact di disk cocok dengan checksum
di dalam report, sehingga model dan angkanya tidak bisa lepas satu sama lain.

Runtime memverifikasi feature schema, feature count, dan kelas A-Z saat startup.
Jika kontraknya berbeda dari kode `app/landmarks.py`, service sengaja gagal start
agar tidak menghasilkan prediksi dari preprocessing yang salah.

## Hasil terverifikasi

Diukur dengan `npm run ai:evaluate` terhadap artifact yang benar-benar dikirim.
Semua split ditahan per sesi rekaman utuh dan **dinilai penuh** — frame tempat
MediaPipe kehilangan satu tangan tetap dihitung, karena di aplikasi frame
seperti itu juga tetap sampai ke model.

| Domain uji | n | Accuracy | Macro F1 | Huruf < 0,90 |
| --- | ---: | ---: | ---: | --- |
| Talkee, sequence held-out (mirip webcam) | 1.560 | **0,9942** | 0,9942 | **tidak ada** |
| Kaggle, gambar held-out (close-up, kamera miring) | 93 | 0,7742 | 0,7544 | 12 huruf |
| Mendeley, signer group held-out (fisheye jarak jauh) | 770 | 0,7636 | 0,7481 | 13 huruf |

Dengan acceptance policy pada domain webcam: accepted accuracy `0,9994`,
coverage `0,9897`.

Recall per huruf pada domain webcam: seluruhnya `1,00` kecuali M `0,93`,
J `0,97`, Y `0,97`, dan R `0,98`.

### Batas yang diketahui

Kaggle dan Mendeley berada di domain kamera yang berbeda dari aplikasi dan
sengaja dipertahankan sebagai stress test. Sebagian besar galatnya bukan
kesalahan classifier melainkan kegagalan deteksi MediaPipe: pada Mendeley hanya
64,7% frame yang jumlah tangannya sesuai hurufnya, dan pada frame yang deteksinya
benar akurasi naik ke `0,8153`. P dan S tetap runtuh ke Q di domain fisheye.

Deteksi dua tahap (crop lalu deteksi ulang) sudah diuji dan hanya menaikkan
kecocokan jumlah tangan dari 63,1% ke 66,9%, sehingga tidak dipakai: penyebabnya
kemungkinan besar bukan resolusi melainkan penekanan non-maximum pada palm
detector ketika kedua tangan bertumpuk.

**Belum ada validasi webcam lintas-pengguna.** Angka domain webcam berasal dari
sequence Talkee yang ditahan, yaitu rekaman baru dari penanda yang mungkin sama.
Rekam set milik sendiri dengan `npm run ai:capture`, lalu ukur dengan
`npm run ai:validate`.

## Sumber training

- Kaggle [`niputukarismadewi/talkee-bisindo-sign-language-dataset`](https://www.kaggle.com/datasets/niputukarismadewi/talkee-bisindo-sign-language-dataset),
  CC0. Korpus utama; pipeline hanya membaca kelas A-Z.
- Kaggle [`achmadnoer/alfabet-bisindo`](https://www.kaggle.com/datasets/achmadnoer/alfabet-bisindo),
  CC0 Public Domain.
- [Mendeley BISINDO dataset](https://data.mendeley.com/datasets/4xnkvr88tk/1),
  DOI `10.17632/4xnkvr88tk.1`, CC BY 4.0.

## Artifact lama

`rf_bisindo_99.pkl` dan `bisindo_geometry_v5.pkl` dilatih sebelum landmark
dikoreksi ke satuan isotropik. Bentuk fiturnya masih cocok, sehingga memuatnya
tidak akan melempar error — ia hanya akan mengembalikan huruf yang salah secara
diam-diam. Karena itu `BisindoClassifier` menolaknya dengan pesan eksplisit dan
keduanya tidak dapat dipakai sebagai rollback. Keduanya boleh dihapus dari
repository.

Untuk konteks, v5 mencapai `0,7467` accuracy pada test signer-held-out dengan
P dan S di recall `0,00`, dan artifact yang dikirimnya di-refit pada train, val,
dan test sekaligus sehingga angka publikasinya menggambarkan model yang tidak
pernah di-deploy.

## Mengganti artifact

Jangan mengganti file produksi hanya berdasarkan validation accuracy. Artifact
baru harus memenuhi seluruh kontrak berikut:

1. tepat 26 kelas dengan urutan `A-Z`;
2. preprocessing yang terdokumentasi dan identik di training/runtime;
3. split yang menahan sesi rekaman utuh, tanpa memotong di dalam sesi;
4. higienis jumlah tangan diterapkan pada data latih saja, tidak pada data uji;
5. acceptance threshold dikalibrasi pada validation, dibekukan sebelum test;
6. tidak ada refit pada data evaluasi;
7. report, checksum, versi, lisensi sumber, dan test runtime diperbarui bersama;
8. `minConfidence` frontend diselaraskan dengan `rejection` di dalam bundle.

Perintah training dan prosedur evaluasi dijelaskan di [`../README.md`](../README.md).
