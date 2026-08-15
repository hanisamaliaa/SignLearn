# SignLearn

SignLearn adalah platform pembelajaran Bahasa Isyarat Indonesia (BISINDO) yang
menggabungkan aplikasi React, REST API Node.js, dan layanan computer vision
Python. Fitur kamera saat ini difokuskan pada pengenalan alfabet BISINDO `A-Z`
secara realtime.

## Komponen

```text
SignLearn/
|-- frontend/   # React 19, Vite 8, Tailwind CSS 4
|-- backend/    # REST API Node.js/Express
|-- ai/         # FastAPI, MediaPipe, calibrated RBF SVM
|-- scripts/    # runner lintas platform
|-- package.json
`-- README.md
```

| Service | Port lokal | Fungsi |
| --- | ---: | --- |
| Backend | `4788` | Akun, konten belajar, kuis, dan progres |
| Frontend | `4789` | UI pengguna dan administrator |
| BISINDO AI | `8000` | Inferensi kamera alfabet A-Z |

Arsitektur kamera sengaja tidak melewati backend aplikasi. Frontend mengirim
frame terkompresi langsung ke layanan AI melalui proxy Vite saat development.
Dengan demikian, request gambar berfrekuensi tinggi tidak membebani API akun dan
konten.

## Prasyarat

- Node.js `24`
- npm
- Python `3.12`
- Kamera browser untuk mencoba pengenalan BISINDO
- Konfigurasi database sesuai [`backend/README.md`](backend/README.md) apabila
  ingin memakai seluruh fitur backend

Versi Node dapat dikelola menggunakan konfigurasi `.mise.toml` di repository.

## Setup pertama

Install dependency JavaScript dari root repository:

```bash
npm install
npm --prefix frontend install
npm --prefix backend install
```

Siapkan virtual environment AI.

Windows PowerShell:

```powershell
py -3.12 -m venv ai\.venv
ai\.venv\Scripts\python.exe -m pip install --upgrade pip
ai\.venv\Scripts\python.exe -m pip install -r ai\requirements.txt
Copy-Item ai\.env.example ai\.env
```

macOS/Linux:

```bash
python3.12 -m venv ai/.venv
ai/.venv/bin/python -m pip install --upgrade pip
ai/.venv/bin/python -m pip install -r ai/requirements.txt
cp ai/.env.example ai/.env
```

Untuk konfigurasi frontend/backend, salin `.env.example` masing-masing sesuai
petunjuk di folder tersebut. Jangan commit file `.env`.

## Menjalankan aplikasi

Jalankan ketiga service dari root:

```bash
npm run dev
```

Runner akan menghentikan service lain jika salah satu service gagal. Tekan
`Ctrl+C` untuk menghentikan semuanya.

Service juga dapat dijalankan terpisah:

```bash
npm run dev:backend
npm run dev:frontend
npm run dev:ai
```

URL development:

- aplikasi: <http://localhost:4789>
- backend: <http://localhost:4788>
- AI health: <http://localhost:8000/api/health>
- dokumentasi AI: <http://localhost:8000/docs>

## Mencoba kamera BISINDO

1. Jalankan frontend dan AI, atau gunakan `npm run dev`.
2. Buka <http://localhost:4789>.
3. Scroll ke penerjemah **Kamera -> Teks**.
4. Klik **Aktifkan Kamera** dan izinkan akses kamera.
5. Pastikan tangan terlihat penuh, cukup dekat, dan pencahayaan merata.
6. Tahan satu huruf hingga hasil stabil.

Untuk mengulang huruf yang sama, lepaskan atau ubah bentuk tangan sebentar
sebelum memperagakan huruf itu lagi. Spasi ditambahkan dengan tombol
**Tambah spasi**.

Pipeline realtime menggunakan:

1. MediaPipe hand landmark detection;
2. 1.179 fitur geometry-v5;
3. calibrated 26-class RBF SVM;
4. confidence dan top-1/top-2 margin rejection;
5. EMA smoothing serta rolling temporal vote di frontend.

Prediksi mentah tidak pernah langsung menjadi karakter. Hanya response AI dengan
`accepted: true` yang dapat masuk ke voting frontend.

Model default adalah `ai/models/bisindo_geometry_v5.pkl`. Pada frozen
signer-test, raw accuracy-nya `74,68%`; setelah rejection threshold, accepted
accuracy `96,88%` dengan coverage `33,25%` dari frame terdeteksi. Angka terakhir
merupakan trade-off presisi terhadap coverage, bukan akurasi seluruh frame.

Dokumentasi teknis lengkap:

- [`ai/README.md`](ai/README.md): instalasi, API, test, konfigurasi, training,
  troubleshooting, dan deployment.
- [`ai/MODEL_RESEARCH.md`](ai/MODEL_RESEARCH.md): audit model publik, evaluasi,
  keputusan arsitektur, dan batasan.
- [`ai/reports/production_v5.json`](ai/reports/production_v5.json): laporan
  evaluasi machine-readable.

## Konfigurasi frontend AI

Variable pengenalan kamera didokumentasikan di
[`frontend/.env.example`](frontend/.env.example). Saat development,
`VITE_BISINDO_AI_URL` sebaiknya kosong agar request memakai proxy Vite:

```text
/bisindo-ai/predict -> http://127.0.0.1:8000/api/v1/predict
```

Untuk melihat telemetry top-3 prediction, smoothing, confidence, dan margin:

```dotenv
VITE_BISINDO_DEBUG=true
```

## Build dan test

Frontend:

```bash
npm --prefix frontend test
npm --prefix frontend run lint
npm --prefix frontend run build
```

AI di Windows:

```powershell
ai\.venv\Scripts\python.exe -m unittest discover -s ai/tests -v
```

AI di macOS/Linux:

```bash
ai/.venv/bin/python -m unittest discover -s ai/tests -v
```

Backend memiliki smoke test HTTP dan database tersendiri. Lihat bagian Testing
di [`backend/README.md`](backend/README.md) karena test tersebut memerlukan
environment serta database khusus.

## Reproduksi model AI

Dataset mentah dan cache tidak disimpan di Git. Untuk mengunduh ketiga dataset
publik dan melatih ulang model produksi:

```bash
npm run ai:download
npm run ai:download:mendeley
npm run ai:download:talkee
npm run ai:train:production
```

Perintah terakhir membuat signer-group holdout, memilih hyperparameter dari
validation group, mengevaluasi frozen test group, kemudian melakukan final refit
menggunakan seluruh data publik. Detail dataset, lisensi, output, dan peringatan
overwrite tersedia di [`ai/README.md`](ai/README.md).

## Catatan privasi

Frame kamera dipakai untuk inferensi dan tidak disimpan oleh implementasi ini.
Jika telemetry atau pengumpulan data ditambahkan di kemudian hari, minta
persetujuan eksplisit pengguna, hindari data identitas, dan dokumentasikan masa
retensi serta prosedur penghapusan.
