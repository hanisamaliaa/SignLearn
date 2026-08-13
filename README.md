# SignLearn

[![GitHub Repository](https://img.shields.io/badge/GitHub-hanisamaliaa%2FSignLearn-181717?logo=github)](https://github.com/hanisamaliaa/SignLearn)

## Project Overview

| Informasi | Keterangan |
| --- | --- |
| **Nama proyek/produk** | SignLearn |
| **Deskripsi** | Platform pembelajaran Bahasa Isyarat Indonesia (BISINDO) yang menggabungkan materi berurutan, kuis, pelacakan progres, bank kata, portal administrasi, dan pengenalan alfabet realtime melalui kamera. |
| **Target pengguna** | Teman Tuli yang ingin mengembangkan komunikasi BISINDO; orang tua atau pendamping yang membantu anak belajar; pelajar umum yang ingin berkomunikasi secara lebih inklusif; serta administrator/pengelola materi. |
| **Target penggunaan** | Pembelajaran BISINDO berbasis web untuk belajar mandiri, pendampingan keluarga, dan pengelolaan materi oleh penyelenggara pembelajaran. |
| **Masalah utama** | Materi BISINDO digital tersebar dan belum selalu menyatukan alur belajar bertahap, evaluasi, progres, administrasi konten, dan latihan visual dengan umpan balik langsung. |
| **Tujuan** | Menyediakan pengalaman belajar BISINDO yang terstruktur, inklusif, dapat dipantau, dan didukung latihan alfabet berbasis computer vision. |
| **Implementasi AI** | MediaPipe Hands mengekstrak 126 koordinat landmark dari maksimal dua tangan; model Random Forest mengklasifikasikan alfabet BISINDO A-Z; frontend menstabilkan probabilitas dengan EMA, voting temporal, filter confidence/margin, dan duplicate-release lock. |
| **Repository** | [github.com/hanisamaliaa/SignLearn](https://github.com/hanisamaliaa/SignLearn) |

SignLearn terdiri dari tiga aplikasi yang berjalan sebagai proses terpisah:

- frontend React untuk halaman publik, portal pembelajar, dan portal administrator;
- REST API Express untuk autentikasi, konten, progres, kuis, laporan, dan bank kata;
- layanan FastAPI untuk ekstraksi landmark tangan dan inferensi alfabet BISINDO A-Z.

Kode frontend memakai istilah peran `user` untuk pembelajar dan `admin` untuk administrator. Registrasi publik selalu membuat akun `user`. Pelajaran berikutnya hanya dapat diakses setelah pelajaran sebelumnya selesai dan kuis terkait lulus dengan nilai minimum 70.

### Problem Statement

Materi BISINDO digital sering tersebar dan belum menyediakan satu alur yang menggabungkan pembelajaran terstruktur, pengelolaan materi, pelacakan progres, serta latihan visual dengan umpan balik langsung. SignLearn menyediakan fondasi aplikasi web untuk menyatukan kebutuhan tersebut dengan perhatian khusus pada aksesibilitas antarmuka.

### Goals

- Menyediakan pembelajaran BISINDO yang bertahap dan dapat dipantau.
- Memisahkan pengalaman pembelajar dan administrasi melalui role-based access control.
- Memberikan latihan alfabet berbasis kamera tanpa mencampur beban inferensi gambar dengan backend aplikasi.
- Menyediakan pipeline training dan evaluasi model yang dapat direproduksi tanpa mengganti model produksi secara otomatis.

### Main Features

- Halaman publik, panduan orang tua, informasi BISINDO, dan kebijakan privasi.
- Registrasi, login, pemulihan sesi, reset kata sandi, dan pengelolaan profil.
- Dashboard pembelajar, daftar kursus, pelajaran, kuis fullscreen, hasil, dan progres.
- Dashboard administrator untuk pengguna, kursus, pelajaran, kuis, laporan, dan bank kata.
- Penerjemah teks-ke-BISINDO berbasis bank kata serta kamera-ke-teks untuk alfabet A-Z.
- Tema terang/gelap, ukuran teks, kontras tinggi, reduced motion, subtitle, dan focus mode.
- Access token berumur pendek, rotasi refresh token, rate limiting, validasi request, dan error envelope konsisten.

### AI Usage and Implementation

Fitur **Kamera → Teks** memakai AI untuk mengenali satu huruf BISINDO statis
per frame:

1. browser menangkap dan mengompresi frame webcam menjadi JPEG;
2. layanan FastAPI memvalidasi gambar;
3. MediaPipe Hands mendeteksi maksimal dua tangan dan mengekstrak 21 landmark
   dengan koordinat x, y, dan z untuk setiap tangan;
4. model Random Forest produksi mengembalikan label A-Z beserta probabilitas,
   confidence, prediksi kedua, dan margin;
5. frontend menyaring rangkaian prediksi sebelum menambahkan huruf ke hasil.

AI tidak digunakan untuk autentikasi, penilaian kuis, atau aturan progres.
Model saat ini hanya mengenali alfabet statis A-Z, bukan kalimat BISINDO
kontinu. Detail model, dataset, training, evaluasi, dan keterbatasan tersedia
di [AI Documentation](ai/README.md).

## GitHub Repository

Source code utama tersedia di:

**[https://github.com/hanisamaliaa/SignLearn](https://github.com/hanisamaliaa/SignLearn)**

Clone repository:

```bash
git clone https://github.com/hanisamaliaa/SignLearn.git
```

## Additional Information

### Deployment URL

Belum ada URL deployment publik atau konfigurasi deployment yang dapat
diverifikasi dari repository. Aplikasi dijalankan secara lokal melalui URL
yang tercantum pada bagian [Menjalankan aplikasi](#menjalankan-aplikasi).

### Test Account

Repository tidak menyimpan kredensial akun demo atau password administrator
bawaan demi keamanan.

- **Akun pembelajar:** buat melalui halaman `/register`; setiap registrasi
  publik mendapat peran `user`.
- **Akun administrator:** pada seed pertama, jalankan
  `npm --prefix backend run seed`. Jika `SEED_ADMIN_PASSWORD` tidak diisi,
  password kuat dibuat dan ditampilkan satu kali di terminal. Bila akun admin
  sudah ada, seed melewatinya dan tidak membuat password baru.
- **Pengujian:** gunakan database test/throwaway; jangan memakai akun dan
  database production.

### Role Assignment

| Peran | Cara mendapatkannya | Portal dan kewenangan utama |
| --- | --- | --- |
| `user` | Registrasi publik | Dashboard pembelajar, kursus, pelajaran, kuis, progres, dan profil |
| `admin` | Seed awal atau perubahan oleh admin yang sah | Dashboard admin, pengguna, kursus, pelajaran, kuis, laporan, dan bank kata |

Frontend dan backend sama-sama melindungi route berdasarkan peran. Namun,
backend tetap menjadi sumber otorisasi utama; menyunting state atau URL di
browser tidak memberikan hak akses tambahan.

## Arsitektur sistem

```mermaid
flowchart LR
    user["Pengguna / Administrator"] --> frontend["Frontend React<br/>localhost:4789"]
    frontend -->|"REST /api/v1<br/>Bearer access token"| backend["Backend Express<br/>localhost:4788"]
    backend -->|"SQL melalui node-postgres"| database[("PostgreSQL / Supabase")]
    frontend -->|"JPEG melalui /bisindo-ai/predict<br/>proxy Vite saat development"| ai["AI FastAPI<br/>localhost:8000"]
    ai --> mediapipe["MediaPipe Hands"]
    mediapipe --> model["Random Forest BISINDO"]
```

Frontend berkomunikasi langsung dengan layanan AI. Backend tidak meneruskan frame kamera dan tidak terlibat dalam jalur inferensi realtime. Endpoint AI administratif pada backend adalah placeholder terpisah untuk rencana pembuatan subtitle dan kuis; keduanya saat ini membalas `501 NOT_IMPLEMENTED`.

## Alur aplikasi

1. Pengguna mendaftar atau masuk melalui frontend.
2. Backend mengembalikan access token untuk disimpan di memori dan refresh token opaque melalui cookie `HttpOnly`.
3. Frontend mengambil kursus, pelajaran, kuis, progres, dan bank kata dari REST API.
4. Backend menerapkan aturan akses pelajaran dan menyimpan hasil ke PostgreSQL.
5. Pada mode kamera, frontend mengompresi frame webcam lalu mengirimkannya langsung ke FastAPI.
6. Layanan AI mengekstrak hingga dua tangan, membentuk 126 fitur landmark, dan mengembalikan probabilitas kelas.
7. Frontend menstabilkan prediksi sebelum menambahkan huruf ke hasil terjemahan.

## Teknologi

| Bagian | Teknologi |
| --- | --- |
| Frontend | React 19, React Router 7, Tailwind CSS 4, Vite 8, Axios, Framer Motion |
| Backend | Node.js, Express 4, PostgreSQL, `pg`, JWT, bcrypt, cookie-parser |
| AI | Python, FastAPI, MediaPipe, OpenCV, NumPy, scikit-learn, joblib |
| Pengujian | Node test runner, HTTP smoke suites, Postman/Newman |
| Tooling | npm, mise, oxlint |

## Struktur proyek

```text
SignLearn/
├── frontend/          # SPA React, route, komponen, state, dan API client
├── backend/           # REST API, skema PostgreSQL, seed, test, dan Postman
├── ai/                # API inferensi, model, dataset workflow, dan evaluasi
├── scripts/           # Orkestrasi tiga layanan dan helper virtual environment
├── .figma/            # Tooling Figma Make
├── README.md          # Dokumentasi proyek
├── TESTING_REPORT.md  # Bukti dan batasan pengujian yang sudah dijalankan
└── package.json       # Perintah lintas modul
```

## Persyaratan

- Node.js 22, sesuai `.mise.toml`.
- npm.
- Python 3.10-3.12; Python 3.12 direkomendasikan untuk MediaPipe.
- PostgreSQL yang dapat diakses, termasuk Supabase PostgreSQL.
- `psql` untuk menjalankan script skema atau migrasi melalui npm.
- Kamera browser untuk menguji inferensi realtime.

## Instalasi

```bash
git clone https://github.com/hanisamaliaa/SignLearn.git
cd SignLearn
```

Jika memakai mise:

```bash
mise install
```

Pasang dependency Node.js pada ketiga package:

```bash
npm install
npm --prefix backend install
npm --prefix frontend install
```

Siapkan virtual environment AI pada macOS/Linux:

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

Salin seluruh template konfigurasi:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
cp ai/.env.example ai/.env
```

Konfigurasi minimum backend:

```dotenv
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
JWT_ACCESS_SECRET=GANTI_DENGAN_SECRET_ACAK_MINIMAL_32_KARAKTER
PORT=4788
API_PREFIX=/api/v1
CORS_ORIGINS=http://localhost:4789,http://127.0.0.1:4789
```

Buat JWT secret tanpa menuliskannya ke repository:

```bash
npm --prefix backend run gen:secret
```

Konfigurasi frontend bawaan menggunakan `http://localhost:4788/api/v1` dan proxy Vite `/bisindo-ai` menuju `http://127.0.0.1:8000/api/v1`. Pertahankan `VITE_API_MOCK_MODE=false` untuk pengembangan dengan backend nyata.

Daftar lengkap tersedia di:

- [`frontend/.env.example`](frontend/.env.example)
- [`backend/.env.example`](backend/.env.example)
- [`ai/.env.example`](ai/.env.example)

Jangan commit file `.env`, kredensial, token, atau password.

## Database

Untuk database kosong, ekspor connection string bagi CLI `psql`, terapkan
skema, lalu jalankan seed:

```bash
export DATABASE_URL='postgresql://USER:PASSWORD@HOST:PORT/DATABASE'
npm --prefix backend run db:schema
npm --prefix backend run seed
```

Untuk database lama yang sudah berisi data, gunakan migrasi non-destruktif dan idempoten:

```bash
export DATABASE_URL='postgresql://USER:PASSWORD@HOST:PORT/DATABASE'
npm --prefix backend run db:migrate
```

Seed membuat peran, akun administrator, kursus/pelajaran contoh, dan beberapa
entri bank kata. Seed saat ini tidak membuat kuis. Jika `SEED_ADMIN_PASSWORD`
kosong, seed membangkitkan password kuat dan menampilkannya satu kali di
terminal.

Entitas utama adalah `roles`, `users`, `refresh_tokens`, `password_reset_tokens`, `courses`, `lessons`, `quizzes`, `quiz_questions`, `lesson_progress`, `quiz_results`, dan `translations`.

## Menjalankan aplikasi

Dari root repository:

```bash
npm run dev
```

Perintah ini menjalankan backend, AI, dan frontend serta menghentikan ketiganya saat `Ctrl+C`. Virtual environment `ai/.venv` harus sudah tersedia. Backend memeriksa koneksi PostgreSQL sebelum membuka port dan akan berhenti jika database tidak dapat diakses.

| Layanan | URL lokal |
| --- | --- |
| Frontend | `http://localhost:4789` |
| Backend health | `http://localhost:4788/api/health` |
| Backend API | `http://localhost:4788/api/v1` |
| AI health | `http://localhost:8000/api/health` |
| AI OpenAPI | `http://localhost:8000/docs` |

Menjalankan layanan secara terpisah:

```bash
npm run dev:frontend
npm run dev:backend
npm run dev:ai
```

## Frontend

Frontend menyediakan tiga kelompok route: publik, `user`, dan `admin`. Route terlindungi memeriksa sesi sekaligus peran. Context React mengelola autentikasi, data pembelajaran, pengaturan pengguna, tema, dan preferensi aksesibilitas tanpa library state management eksternal.

Lihat [dokumentasi frontend](frontend/README.md).

## Backend dan API

REST API memakai prefix `/api/v1`. Endpoint dikelompokkan menjadi:

| Kelompok | Base path | Fungsi |
| --- | --- | --- |
| Authentication | `/auth` | Registrasi, login, refresh, logout, password, dan sesi |
| Users | `/users` | Profil sendiri dan administrasi pengguna |
| Courses | `/courses` | Kursus, pelajaran bersarang, kuis, dan pertanyaan |
| Lessons | `/lessons` | Akses pelajaran langsung berdasarkan ID |
| Progress | `/progress` | Progres pengguna dan aturan akses pelajaran |
| Dashboard | `/dashboard` | Dashboard pembelajar, admin, dan laporan |
| Admin | `/admin` | Statistik, aktivitas, hasil kuis, dan placeholder AI |
| Translations | `/translations` | Bank kata BISINDO dan lookup publik |

Seluruh respons sukses memakai envelope `{ success, message, data }`. Error memakai `{ success, status, code, message, errors? }`.

Lihat [dokumentasi backend](backend/README.md) dan [koleksi Postman](backend/postman/README.md).

## AI dan machine learning

Model produksi `ai/models/rf_bisindo_99.pkl` adalah Random Forest dengan input 126 koordinat landmark: dua tangan × 21 titik × tiga koordinat. API menerima body gambar langsung, bukan JSON atau multipart form.

Alur kamera:

1. frontend menangkap JPEG dengan lebar maksimum 640 piksel;
2. FastAPI memvalidasi tipe dan ukuran body;
3. MediaPipe Hands mengekstrak landmark hingga dua tangan;
4. model mengembalikan top-1, top-2, confidence, margin, dan seluruh probabilitas;
5. frontend menerapkan smoothing dan voting sebelum memperbarui hasil.

Model hanya mengenali alfabet statis A-Z. Pemisahan kata dilakukan melalui tombol **Tambah spasi** di frontend.

Lihat [dokumentasi AI](ai/README.md).

## Training dan evaluasi AI

```bash
npm run ai:download
npm run ai:train
npm run ai:evaluate
```

Dataset mentah dan split manifest dihasilkan secara lokal serta diabaikan Git. Training menghasilkan model kandidat di `ai/models/candidates/`; evaluasi menghasilkan perbandingan dan confusion matrix di `ai/reports/`. Pipeline tidak mengganti model produksi secara otomatis.

Artefak evaluasi yang saat ini di-commit membandingkan model produksi dan kandidat Extra Trees pada 49 sampel test asli yang landmark-nya berhasil diekstrak. Hasil tersebut menetapkan `production_replacement_recommended: false`. Detail metrik dan keterbatasannya ada di [`ai/reports/model_comparison.json`](ai/reports/model_comparison.json) dan [dokumentasi AI](ai/README.md).

## Testing

| Area | Perintah | Cakupan |
| --- | --- | --- |
| Frontend | `npm --prefix frontend test` | Konfigurasi aksesibilitas/navigasi dan pipeline stabilisasi BISINDO |
| Frontend | `npm run lint:frontend` | Static lint untuk `frontend/src` |
| Frontend | `npm run build:frontend` | Build produksi Vite |
| Backend | `npm --prefix backend test` | Unit test validator/normalisasi bank kata |
| Backend | `npm --prefix backend run smoke:all` | HTTP, PostgreSQL, autentikasi, konten, progres, dashboard, dan transaksi |
| API | Newman/Postman | Koleksi request positif dan negatif |

Smoke test membutuhkan server aktif, database yang sudah di-seed, dan `SEED_ADMIN_PASSWORD`. Gunakan database throwaway agar data test tidak mengotori database pengembangan.

Hasil yang benar-benar pernah dijalankan, kasus yang diblokir oleh ketiadaan kredensial database, UAT simulation, dan tinjauan WCAG dicatat di [TESTING_REPORT.md](TESTING_REPORT.md). Laporan tersebut tidak mengklaim sertifikasi WCAG atau skor SUS tanpa responden.

## Troubleshooting

### Backend berhenti sebelum membuka port

Pastikan `backend/.env` berisi `DATABASE_URL` yang valid dan database dapat dijangkau. Backend sengaja fail-fast bila PostgreSQL tidak tersedia.

### Login atau registrasi gagal seperti masalah jaringan

Periksa tiga nilai berikut secara bersamaan:

- `backend/.env`: `PORT=4788` dan `API_PREFIX=/api/v1`;
- `frontend/.env.local`: `VITE_API_BASE_URL=http://localhost:4788/api/v1`;
- pada production, `backend/.env`: `CORS_ORIGINS` memuat origin frontend.

Pada development backend mengizinkan origin browser secara dinamis, sehingga
penyebab yang lebih umum adalah base URL/prefix yang keliru atau
`VITE_API_MOCK_MODE=true`.

### Port frontend sudah digunakan

Vite memakai `strictPort: true` dan tidak berpindah port otomatis. Hentikan proses yang memakai `4789` atau ubah port beserta konfigurasi CORS terkait.

### Layanan AI tidak ditemukan

Pastikan `ai/.venv` sudah dibuat dan `uvicorn` terpasang. Periksa `http://localhost:8000/api/health`. Untuk development, biarkan `VITE_BISINDO_AI_URL` kosong agar frontend memakai proxy Vite.

### Kamera tidak berjalan

Berikan izin kamera, gunakan browser yang mendukung `getUserMedia`, dan buka aplikasi melalui `localhost` atau origin HTTPS. Periksa console browser serta status layanan AI.

### Smoke test menerima `429`

Jalankan server test dengan `NODE_ENV=test`; mode tersebut menonaktifkan rate limiter agar suite yang membuat beberapa akun tidak saling mengganggu.

## Dokumentasi

- [Frontend Documentation](frontend/README.md)
- [Backend Documentation](backend/README.md)
- [AI Documentation](ai/README.md)
- [Postman Collection Guide](backend/postman/README.md)
- [Testing Report](TESTING_REPORT.md)
- [Dataset Notes](ai/data/DATASET.md)
- [Model Provenance](ai/models/README.md)

## Kontributor

Riwayat kontributor tersedia pada halaman [GitHub Contributors](https://github.com/hanisamaliaa/SignLearn/graphs/contributors).

## Lisensi

Repository ini belum menyertakan file lisensi tingkat root. Karena itu, tidak ada lisensi distribusi yang dapat diasumsikan untuk keseluruhan aplikasi. Dataset training dicatat sebagai CC0 di [`ai/data/DATASET.md`](ai/data/DATASET.md), sedangkan asal model produksi memiliki informasi lisensi tersendiri di [`ai/models/SOURCE_LICENSE.txt`](ai/models/SOURCE_LICENSE.txt).
