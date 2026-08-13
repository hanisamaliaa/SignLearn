
# SignLearn

Platform pembelajaran Bahasa Isyarat Indonesia (BISINDO) yang terstruktur, inklusif, dan dilengkapi pengenalan alfabet secara realtime melalui kamera.

SignLearn merupakan proyek capstone dengan tiga layanan utama: aplikasi React untuk pengguna dan administrator, REST API Node.js untuk autentikasi serta data pembelajaran, dan layanan Python untuk inferensi BISINDO.

## Fitur utama

- Portal pengguna untuk mengikuti kursus, pelajaran, kuis, dan memantau progres.
- Portal administrator untuk mengelola pengguna, kursus, pelajaran, kuis, laporan, dan bank kata.
- Autentikasi berbasis access token dan refresh cookie dengan pemisahan peran `user` dan `admin`.
- Pembelajaran berurutan: pelajaran berikutnya terbuka setelah pelajaran dan kuis sebelumnya selesai dengan nilai minimum 70.
- Kamera-ke-teks BISINDO A-Z dengan MediaPipe dan model Random Forest.
- Stabilisasi prediksi di frontend menggunakan EMA, voting mayoritas, margin confidence, dan duplicate-release lock.
- Dukungan tema, preferensi aksesibilitas, serta tampilan responsif.

## Arsitektur

```text
Browser (React + Vite, :4789)
├── REST API ───────────────> Express API (:4788) ──> PostgreSQL/Supabase
└── Frame webcam terkompresi > FastAPI AI (:8000) ──> MediaPipe + Random Forest
```

Layanan AI dipisahkan dari backend aplikasi agar permintaan inferensi gambar berfrekuensi tinggi tidak membebani proses autentikasi, konten, kuis, dan progres.

## Teknologi

| Bagian | Teknologi |
| --- | --- |
| Frontend | React 19, React Router 7, Tailwind CSS 4, Vite 8, Axios, Framer Motion |
| Backend | Node.js, Express, PostgreSQL, JWT, bcrypt, cookie-based refresh token |
| AI | Python, FastAPI, MediaPipe, OpenCV, scikit-learn |
| Tooling | npm, mise, oxlint, Node test runner |

## Struktur repository

```text
SignLearn/
├── frontend/          # Aplikasi React, halaman, komponen, state, dan API client
├── backend/           # REST API Express, skema PostgreSQL, seed, test, dan Postman
├── ai/                # API inferensi, model BISINDO, training, dan laporan evaluasi
├── scripts/           # Orkestrasi layanan dan helper virtual environment
├── .figma/            # Tooling proyek Figma Make
├── TESTING_REPORT.md  # Ringkasan pengujian proyek
└── package.json       # Perintah lintas layanan dari root
```

Struktur utama `frontend/src/`:

- `components/` — komponen UI dan layout yang dapat digunakan kembali.
- `pages/` — layar lengkap pengguna, administrator, dan halaman publik.
- `routes/` — rute publik, rute terlindungi, dan pembatasan berdasarkan peran.
- `context/` — state autentikasi, pengaturan, tema, dan pembelajaran.
- `services/` — akses REST API dan normalisasi respons.
- `features/` — logika fitur terisolasi, termasuk pipeline BISINDO.
- `data/` — konten mock untuk pengembangan tampilan.
- `utils/` dan `config/` — utilitas serta konfigurasi bersama.

## Prasyarat

- Node.js 22 (tersedia melalui `.mise.toml` bila menggunakan [mise](https://mise.jdx.dev/)).
- npm.
- Python 3.10-3.12; Python 3.12 direkomendasikan untuk kompatibilitas MediaPipe.
- Database PostgreSQL, misalnya Supabase PostgreSQL atau PostgreSQL lokal.

## Instalasi

Clone repository dan masuk ke direktori proyek:

```bash
git clone https://github.com/hanisamaliaa/SignLearn.git
cd SignLearn
```

Jika menggunakan mise:

```bash
mise install
```

Pasang seluruh dependency Node.js:

```bash
npm install
npm --prefix backend install
npm --prefix frontend install
```

Siapkan virtual environment AI.

macOS/Linux:

```bash
python3.12 -m venv ai/.venv
source ai/.venv/bin/activate
pip install -r ai/requirements.txt
deactivate
```

Windows PowerShell:

```powershell
py -3.12 -m venv ai/.venv
ai/.venv/Scripts/Activate.ps1
pip install -r ai/requirements.txt
deactivate
```

## Konfigurasi environment

Buat file konfigurasi lokal dari contoh yang tersedia:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
cp ai/.env.example ai/.env
```

Pada Windows, salin ketiga file tersebut melalui File Explorer atau gunakan `Copy-Item` di PowerShell.

Konfigurasi minimum backend yang perlu diperiksa:

```dotenv
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
JWT_ACCESS_SECRET=secret-acak-minimal-32-karakter
PORT=4788
API_PREFIX=/api/v1
CORS_ORIGINS=http://localhost:4789,http://127.0.0.1:4789
```

Buat JWT secret yang kuat dengan:

```bash
cd backend
npm run gen:secret
cd ..
```

Untuk Supabase, gunakan transaction pooler pada port `6543` seperti panduan di `backend/.env.example`. Password yang mengandung karakter khusus harus di-percent-encode di dalam `DATABASE_URL`.

Konfigurasi frontend bawaan mengarah ke `http://localhost:4788/api/v1`. Pastikan `VITE_API_BASE_URL`, `PORT` backend, dan `CORS_ORIGINS` tetap konsisten bila salah satunya diubah. Untuk pengembangan normal, pertahankan `VITE_API_MOCK_MODE=false`.

## Menyiapkan database

Terapkan skema dan isi data awal:

```bash
cd backend
npm run db:schema
npm run seed
cd ..
```

Seed membuat akun administrator dari `SEED_ADMIN_EMAIL` dan `SEED_ADMIN_NAME`. Jika `SEED_ADMIN_PASSWORD` tidak diisi, seed membangkitkan password kuat dan menampilkannya satu kali di terminal. Simpan password tersebut dengan aman; repository tidak menyediakan password admin bawaan.

## Menjalankan aplikasi

Dari root repository:

```bash
npm run dev
```

Perintah ini menjalankan backend, frontend, dan layanan AI bersamaan. Semua proses dihentikan ketika `Ctrl+C` ditekan. Backend membutuhkan koneksi database yang valid dan akan berhenti jika PostgreSQL tidak dapat diakses.

| Layanan | URL |
| --- | --- |
| Frontend | `http://localhost:4789` |
| Backend health check | `http://localhost:4788/api/health` |
| Backend API | `http://localhost:4788/api/v1` |
| AI health check | `http://localhost:8000/api/health` |
| Dokumentasi AI | `http://localhost:8000/docs` |

Layanan juga dapat dijalankan secara terpisah:

```bash
npm run dev:frontend
npm run dev:backend
npm run dev:ai
```

## Kamera ke teks BISINDO

1. Buka `http://localhost:4789`.
2. Pilih **Kamera → Teks** dan izinkan akses kamera.
3. Tahan satu isyarat hingga prediksi stabil.
4. Untuk mengulang huruf yang sama, lepaskan atau ubah isyarat sebentar sebelum memperagakannya kembali.
5. Tambahkan spasi melalui tombol **Tambah spasi**.

Model produksi berada di `ai/models/rf_bisindo_99.pkl` dan mengenali alfabet statis A-Z. Frame mentah tidak langsung ditambahkan ke hasil terjemahan. Frontend terlebih dahulu menyaring confidence, margin top-1/top-2, durasi stabil, serta voting prediksi.

Parameter tuning tersedia sebagai `VITE_BISINDO_*` di `frontend/.env.example`. Aktifkan `VITE_BISINDO_DEBUG=true` di `frontend/.env.local` untuk melihat telemetry inferensi dan tiga prediksi teratas.

## Build, lint, dan test

Jalankan dari root repository:

```bash
# Build produksi frontend ke frontend/dist/
npm run build:frontend

# Lint frontend
npm run lint:frontend

# Unit test frontend
npm --prefix frontend test

# Test backend
npm --prefix backend test

# Smoke test integrasi backend yang sedang berjalan
npm --prefix backend run smoke:all
```

Test backend dan smoke test menggunakan PostgreSQL sungguhan. Gunakan database test/throwaway agar data pengembangan tidak tercampur dengan data pengujian. Instruksi lengkap tersedia di [`backend/README.md`](backend/README.md), sedangkan hasil pengujian proyek dirangkum di [`TESTING_REPORT.md`](TESTING_REPORT.md).

## Retraining model BISINDO

Dataset training tidak diduplikasi ke repository karena tidak diperlukan saat inferensi. Pipeline leakage-safe dapat dijalankan dari root setelah virtual environment AI siap:

```bash
npm run ai:download
npm run ai:train
npm run ai:evaluate
```

- Dataset diunduh ke `ai/data/raw/`.
- Manifest split disimpan di `ai/data/splits/`.
- Model kandidat disimpan di `ai/models/candidates/`.
- Hasil evaluasi ditulis ke `ai/reports/`.
- Model produksi tidak diganti secara otomatis.

Penjelasan endpoint, format respons, dataset, dan evaluasi tersedia di [`ai/README.md`](ai/README.md).

## Dokumentasi lanjutan

- [`backend/README.md`](backend/README.md) — konfigurasi API, endpoint, database, Postman, dan smoke test.
- [`backend/postman/README.md`](backend/postman/README.md) — penggunaan koleksi Postman.
- [`ai/README.md`](ai/README.md) — layanan inferensi serta pipeline training.
- [`TESTING_REPORT.md`](TESTING_REPORT.md) — laporan pengujian.

## Catatan keamanan

- Jangan commit file `.env`, kredensial database, JWT secret, atau password akun seed.
- Gunakan `COOKIE_SECURE=true` dan origin CORS eksplisit pada production HTTPS.
- Jangan menyimpan access token di `localStorage`; frontend menyimpannya di memori dan menggunakan refresh cookie.
- Rotasi segera kredensial yang pernah terekspos di log, commit, screenshot, atau percakapan.
