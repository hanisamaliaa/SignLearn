# SignLearn BISINDO AI

Layanan FastAPI untuk mengenali alfabet BISINDO `A-Z` dari frame kamera.
Browser mengirim gambar JPEG, MediaPipe mendeteksi maksimal dua tangan,
`geometry-v5` membangun 1.179 fitur yang tahan terhadap perubahan posisi dan
skala, lalu calibrated RBF SVM menghasilkan probabilitas untuk tepat 26 kelas.

Model menerapkan kebijakan penolakan konservatif. Prediksi dengan confidence
atau selisih probabilitas yang terlalu rendah tetap dikembalikan untuk
diagnostik, tetapi diberi `accepted: false` dan tidak boleh masuk ke voting
temporal di frontend.

> Ruang lingkup saat ini hanya alfabet statis/dinamis per frame `A-Z`. Layanan
> ini belum mengenali kata, kalimat, ekspresi wajah, atau tata bahasa BISINDO.

## Navigasi

- [Instalasi](#instalasi)
- [Menjalankan layanan](#menjalankan-layanan)
- [Kontrak API](#api)
- [Menguji kamera di web](#menguji-kamera-di-web)
- [Evaluasi model](#evaluasi-model)
- [Menjalankan test](#menjalankan-test)
- [Konfigurasi environment](#konfigurasi-environment)
- [Dataset dan reproduksi training](#dataset-dan-reproduksi-training)
- [Troubleshooting](#troubleshooting)
- [Catatan deployment](#catatan-deployment)

## Ringkasan status

| Komponen | Nilai |
| --- | --- |
| Model default | `models/bisindo_geometry_v5.pkl` |
| Kelas | `A-Z` (26 kelas) |
| Feature schema | `bisindo-geometry-v5`, 1.179 fitur |
| Classifier | RBF SVM, Platt probability calibration |
| Ambang penerimaan | confidence `>= 0.93`, margin `>= 0.02` |
| Endpoint health | `GET /api/health` |
| Endpoint prediksi | `POST /api/v1/predict` |
| Port lokal | `8000` |

Model produksi dan metadata evaluasinya sudah disertakan di repository. Dataset
mentah dan feature cache tidak disertakan karena ukurannya besar dan dapat
dibangun kembali.

## Alur inferensi

```text
Webcam browser
  -> JPEG frame
  -> POST /api/v1/predict
  -> decode dan validasi gambar
  -> MediaPipe Hand Landmarker
  -> passive-hand filtering
  -> geometry-v5 feature extraction
  -> calibrated RBF SVM
  -> confidence/margin rejection
  -> frontend EMA + temporal voting
  -> karakter ditambahkan ke hasil
```

MediaPipe dijalankan dalam static image mode untuk setiap request. Ini mencegah
state tracking dari satu pengguna tercampur dengan request pengguna lain.
Ekstraksi landmark dilindungi lock sehingga aman saat endpoint menerima request
bersamaan.

## Prasyarat

- Python `3.12`
- Node.js `24` dan npm, jika memakai script dari root repository
- Kamera browser untuk pengujian realtime
- Model `models/bisindo_geometry_v5.pkl`, sudah tersedia di repository

Versi dependency Python dikunci di `requirements.txt` agar feature extraction
dan deserialisasi model konsisten.

## Instalasi

Jalankan dari root repository.

### Windows PowerShell

```powershell
py -3.12 -m venv ai\.venv
ai\.venv\Scripts\python.exe -m pip install --upgrade pip
ai\.venv\Scripts\python.exe -m pip install -r ai\requirements.txt
Copy-Item ai\.env.example ai\.env
```

### macOS/Linux

```bash
python3.12 -m venv ai/.venv
ai/.venv/bin/python -m pip install --upgrade pip
ai/.venv/bin/python -m pip install -r ai/requirements.txt
cp ai/.env.example ai/.env
```

Menyalin `.env.example` tidak wajib apabila konfigurasi bawaan sudah sesuai,
tetapi direkomendasikan agar origin frontend lokal `4789` diizinkan secara
eksplisit.

## Menjalankan layanan

### AI saja

```bash
npm run dev:ai
```

Script memilih executable virtualenv Windows atau Unix secara otomatis. Setelah
startup berhasil:

- health: <http://127.0.0.1:8000/api/health>
- Swagger UI: <http://127.0.0.1:8000/docs>
- OpenAPI JSON: <http://127.0.0.1:8000/openapi.json>

Perintah langsung tanpa npm:

```bash
# Jalankan dari folder ai setelah virtualenv aktif.
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### Seluruh aplikasi

Pastikan dependency `frontend/` dan `backend/` sudah terpasang serta environment
backend sudah dikonfigurasi, lalu jalankan dari root:

```bash
npm run dev
```

Perintah tersebut menjalankan backend `4788`, frontend `4789`, dan AI `8000`.
Buka <http://localhost:4789>, pilih **Kamera -> Teks**, klik **Aktifkan Kamera**,
lalu izinkan akses kamera.

## API

### Health check

```http
GET /api/health
```

Contoh respons:

```json
{
  "status": "ok",
  "service": "signlearn-bisindo-ai",
  "modelLoaded": true,
  "model": {
    "name": "rbf_svc_bisindo_geometry",
    "version": "5.0.0-2026-08-14",
    "featureSchema": "bisindo-geometry-v5",
    "classes": 26,
    "rejection": {
      "min_confidence": 0.93,
      "min_margin": 0.02
    }
  }
}
```

`status: ok` dan `modelLoaded: true` harus keduanya terpenuhi sebelum kamera
digunakan.

### Prediksi satu frame

```http
POST /api/v1/predict
Content-Type: image/jpeg

<raw image bytes>
```

Body merupakan byte gambar langsung, bukan JSON dan bukan multipart form.
Format gambar lain boleh digunakan selama `Content-Type` diawali `image/` dan
OpenCV dapat mendekodenya. Ukuran maksimal default adalah 2 MB.

Contoh dengan curl:

```bash
curl -X POST \
  -H "Content-Type: image/jpeg" \
  --data-binary @contoh-huruf-a.jpg \
  http://127.0.0.1:8000/api/v1/predict
```

Contoh PowerShell:

```powershell
Invoke-RestMethod `
  -Uri http://127.0.0.1:8000/api/v1/predict `
  -Method Post `
  -ContentType image/jpeg `
  -InFile .\contoh-huruf-a.jpg
```

Contoh respons yang diterima:

```json
{
  "detected": true,
  "accepted": true,
  "label": "A",
  "confidence": 0.97,
  "handsDetected": 2,
  "relevantHands": 2,
  "handSpan": 0.16,
  "probabilities": {
    "A": 0.97,
    "B": 0.01
  },
  "secondLabel": "B",
  "margin": 0.96,
  "rejectionReason": null
}
```

Arti field penting:

| Field | Arti |
| --- | --- |
| `detected` | MediaPipe menemukan sedikitnya satu tangan |
| `accepted` | Prediksi melewati seluruh ambang keamanan model |
| `label` | Kelas top-1; jangan tampilkan sebagai hasil final jika `accepted` bernilai `false` |
| `confidence` | Probabilitas kelas top-1 setelah kalibrasi |
| `secondLabel` | Kelas dengan probabilitas kedua terbesar |
| `margin` | Selisih probabilitas top-1 dan top-2 |
| `handsDetected` | Jumlah tangan yang mula-mula dideteksi MediaPipe |
| `relevantHands` | Jumlah tangan yang dipakai setelah passive-hand filtering |
| `handSpan` | Ukuran relatif tangan untuk mendeteksi tangan yang terlalu jauh/kecil |
| `probabilities` | Distribusi probabilitas lengkap A-Z |
| `rejectionReason` | Alasan prediksi tidak diterima |

Alasan penolakan:

| Nilai | Kondisi |
| --- | --- |
| `no_hands` | Tidak ada tangan yang terdeteksi |
| `hand_too_small` | Tangan terlalu kecil/jauh dari kamera |
| `low_confidence` | Confidence top-1 di bawah ambang model |
| `low_margin` | Top-1 terlalu dekat dengan top-2 |

Status error endpoint:

| HTTP | Kondisi |
| ---: | --- |
| `400` | Body kosong atau gambar tidak dapat didekode |
| `413` | Gambar melampaui `AI_MAX_IMAGE_BYTES` |
| `415` | `Content-Type` bukan `image/*` |
| `503` | Model belum siap |

## Menguji kamera di web

1. Jalankan `npm run dev` atau jalankan frontend dan AI secara terpisah.
2. Buka <http://localhost:4789>. `localhost` dianggap secure context oleh browser
   sehingga akses kamera diperbolehkan.
3. Di bagian penerjemah, pilih **Kamera -> Teks** dan klik **Aktifkan Kamera**.
4. Pastikan seluruh tangan terlihat, tidak terlalu jauh, dan pencahayaan merata.
5. Tahan satu bentuk huruf hingga beberapa frame konsisten.
6. Untuk mengulang huruf yang sama, lepaskan/ubah bentuk tangan sebentar sebelum
   memperagakan huruf tersebut lagi.

Saat development, frontend memakai proxy Vite:

```text
/bisindo-ai/predict -> http://127.0.0.1:8000/api/v1/predict
```

Aktifkan `VITE_BISINDO_DEBUG=true` di `frontend/.env.local` untuk melihat top-3
probability, hasil mentah, hasil smoothing, confidence, dan margin.

## Evaluasi model

Evaluasi memakai capture/signer group holdout: satu kelompok lengkap untuk
validasi dan satu kelompok lengkap untuk test. Frame berdekatan dari orang yang
sama tidak diacak ke train dan test. Protokol ini lebih ketat dan lebih relevan
untuk mengukur generalisasi ke pengguna baru.

| Metrik frozen signer-test | Nilai |
| --- | ---: |
| Gambar sumber | 780 |
| MediaPipe detection rate | 98,72% |
| Raw accuracy pada 770 frame terdeteksi | 74,68% |
| Raw macro F1 | 73,88% |
| End-to-end raw accuracy, termasuk detection failure | 73,72% |
| Accepted accuracy | 96,88% |
| Accepted coverage dari frame terdeteksi | 33,25% (256/770) |
| End-to-end accepted rate | 32,82% (256/780) |

Benchmark CPU yang dicatat pada 104 gambar, mencakup JPEG decode, MediaPipe,
feature extraction, dan SVM:

| Metrik runtime | Nilai |
| --- | ---: |
| Mean | 35,22 ms/frame |
| p50 | 35,44 ms/frame |
| p95 | 40,99 ms/frame |
| Throughput berdasarkan mean | sekitar 28,4 FPS |

Interpretasi yang benar:

- `96,88%` adalah akurasi **hanya pada frame yang diterima**, bukan seluruh
  frame kamera.
- Coverage `33,25%` adalah trade-off yang disengaja agar prediksi meragukan
  tidak berubah menjadi huruf salah di web.
- Setelah evaluasi dibekukan, bundle deployment di-refit menggunakan seluruh
  partisipan publik. Karena itu, metrik di atas milik frozen evaluation model,
  bukan evaluasi independen baru terhadap bundle hasil refit.
- Angka dataset publik belum menggantikan validasi lapangan dengan pengguna
  dan pengajar BISINDO.

Audit lengkap tersedia di:

- [`MODEL_RESEARCH.md`](MODEL_RESEARCH.md): keputusan model, audit model publik,
  akar masalah model lama, dan batasan.
- [`reports/production_v5.json`](reports/production_v5.json): hasil lengkap,
  per-class metrics, confusion matrix, threshold grid, dan metadata refit.
- [`models/model_metadata.json`](models/model_metadata.json): identitas dan
  checksum bundle produksi.

## Menjalankan test

Dari root repository:

```powershell
# Windows
ai\.venv\Scripts\python.exe -m unittest discover -s ai/tests -v
```

```bash
# macOS/Linux
ai/.venv/bin/python -m unittest discover -s ai/tests -v
```

Test Python memverifikasi bentuk fitur, passive-hand filtering, kontrak kelas
A-Z, feature schema, dan SHA-256 bundle. Test integrasi frontend:

```bash
npm --prefix frontend test
npm --prefix frontend run lint
npm --prefix frontend run build
```

Smoke test runtime minimum:

```bash
curl http://127.0.0.1:8000/api/health
```

Pastikan respons memuat `"modelLoaded": true`, `"classes": 26`, dan
`"featureSchema": "bisindo-geometry-v5"`.

## Konfigurasi environment

Salin `ai/.env.example` menjadi `ai/.env` jika ingin mengubah konfigurasi.

| Variable | Nilai contoh | Keterangan |
| --- | --- | --- |
| `BISINDO_MODEL_PATH` | `models/bisindo_geometry_v5.pkl` | Path relatif terhadap folder `ai/`, atau path absolut |
| `AI_CORS_ORIGINS` | `http://localhost:4789,http://127.0.0.1:4789` | Daftar origin dipisahkan koma |
| `AI_MAX_IMAGE_BYTES` | `2000000` | Batas body gambar |
| `AI_MIN_DETECTION_CONFIDENCE` | `0.5` | Ambang deteksi MediaPipe |
| `AI_MIN_TRACKING_CONFIDENCE` | `0.5` | Parameter kompatibilitas MediaPipe |
| `BISINDO_FEATURE_MODE` | `geometry` | Mode fallback untuk model legacy; bundle v5 selalu memvalidasi schema geometry |
| `BISINDO_MIN_HAND_SPAN` | `0.06` | Tolak tangan yang terlalu kecil dalam frame |

Ambang `min_confidence` dan `min_margin` tersimpan di dalam bundle model agar
runtime, evaluasi, dan deployment selalu memakai kebijakan yang sama. Jangan
menurunkannya hanya untuk mengejar coverage tanpa evaluasi ulang.

## Dataset dan reproduksi training

Model menggunakan tiga sumber publik, semuanya dibatasi ke kelas alfabet A-Z:

1. Mendeley BISINDO, DOI `10.17632/4xnkvr88tk.1`, CC BY 4.0.
2. Kaggle `achmadnoer/alfabet-bisindo`, CC0.
3. Kaggle `niputukarismadewi/talkee-bisindo-sign-language-dataset`, CC0. Hanya
   direktori A-Z yang dibaca; tujuh kelas kata tidak dimuat.

Unduh dari root repository:

```bash
npm run ai:download
npm run ai:download:mendeley
npm run ai:download:talkee
```

Struktur dan lisensi dataset dijelaskan lebih lanjut di
[`data/DATASET.md`](data/DATASET.md). Raw image, landmark sequence, split
manifest, dan feature cache diabaikan Git.

Training produksi:

```bash
npm run ai:train:production
```

Pipeline akan:

1. membuat group holdout manifest;
2. mengekstrak atau memuat cache geometry-v5;
3. melakukan horizontal mirror augmentation;
4. membandingkan kandidat `C=0.3`, `1.0`, dan `3.0` berdasarkan validation macro
   F1;
5. mengkalibrasi probability dan memilih rejection threshold dari validation;
6. mengevaluasi sekali pada signer-test yang belum disentuh;
7. melakukan final refit memakai seluruh data publik;
8. menulis model dan laporan produksi.

Output default:

```text
ai/models/bisindo_geometry_v5.pkl
ai/reports/production_v5.json
ai/data/cache/*.npz          # lokal, gitignored
ai/data/splits/*.json        # lokal, gitignored
```

> `npm run ai:train:production` menimpa model dan report default. Gunakan argumen
> `--output` dan `--report` secara langsung jika sedang bereksperimen dan belum
> ingin mengganti artifact produksi.

## Struktur folder

```text
ai/
|-- app/
|   |-- main.py                 # FastAPI dan endpoint
|   |-- classifier.py           # model loading, inference, rejection
|   `-- landmarks.py            # MediaPipe dan geometry-v5
|-- data/
|   `-- DATASET.md              # sumber, lisensi, struktur data lokal
|-- models/
|   |-- bisindo_geometry_v5.pkl # bundle produksi
|   `-- model_metadata.json     # metadata dan checksum
|-- reports/
|   `-- production_v5.json      # audit evaluasi lengkap
|-- tests/
|   `-- test_production_model.py
|-- training/
|   |-- download_*.py
|   `-- train_production.py
|-- .env.example
|-- MODEL_RESEARCH.md
|-- README.md
`-- requirements.txt
```

## Troubleshooting

### `BISINDO model not found`

Pastikan `ai/models/bisindo_geometry_v5.pkl` tersedia dan
`BISINDO_MODEL_PATH` benar. Relative path dihitung dari folder `ai/`.

### `Model feature schema does not match runtime`

Kode `app/landmarks.py` dan bundle model berasal dari versi yang berbeda.
Pulihkan pasangan kode/model dari commit yang sama atau retrain model.

### Kamera aktif tetapi selalu `no_hands`

Dekatkan tangan ke kamera, tampilkan seluruh telapak/jari, tambah pencahayaan,
dan hindari motion blur. Coba satu tangan dahulu untuk huruf satu tangan.

### Sering `low_confidence` atau `low_margin`

Ini bukan error server. Model sengaja menolak frame ambigu. Pertahankan bentuk
huruf beberapa frame, gunakan latar sederhana, dan cek telemetry dengan
`VITE_BISINDO_DEBUG=true`.

### Browser tidak meminta izin kamera

Gunakan `http://localhost:4789` saat development atau HTTPS di deployment.
Periksa izin kamera untuk origin tersebut di pengaturan browser.

### Request dari production terkena CORS

Tambahkan origin web production secara eksplisit ke `AI_CORS_ORIGINS`. Jangan
gunakan wildcard apabila service dipublikasikan ke internet.

## Catatan deployment

- Gunakan HTTPS untuk web dan AI di luar `localhost`.
- Terapkan batas ukuran request dan rate limiting di reverse proxy.
- Jangan menyimpan frame kamera tanpa persetujuan eksplisit pengguna.
- Pantau rejection rate, latency, dan distribusi kelas tanpa menyimpan identitas.
- Lakukan canary/rollback berdasarkan versi serta SHA-256 model.
- Validasi model dengan pengguna BISINDO nyata sebelum menyatakan akurasi
  lapangan atau memperluasnya ke kata/kalimat.
