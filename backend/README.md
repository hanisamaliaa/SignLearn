# SignLearn Backend

REST API Node.js dan Express untuk autentikasi, konten pembelajaran, kuis, progres, dashboard, laporan, serta bank kata BISINDO.

[Kembali ke dokumentasi utama](../README.md)

## Gambaran umum

Backend menggunakan PostgreSQL sebagai sumber kebenaran untuk akun, sesi, kursus, pelajaran, kuis, progres, dan terjemahan. Server memvalidasi konfigurasi dan koneksi database saat start. Jika `DATABASE_URL` hilang atau PostgreSQL tidak dapat dijangkau, proses berhenti sebelum membuka port.

API memakai prefix `/api/v1`; health check berada di luar prefix pada `/api/health`.

## Teknologi

| Teknologi | Penggunaan |
| --- | --- |
| Node.js + Express 4 | Runtime dan HTTP framework |
| PostgreSQL + `pg` | Penyimpanan dan transaction pool |
| JWT (`jsonwebtoken`) | Access token bertanda tangan |
| Opaque refresh token | Sesi jangka panjang, rotasi, dan reuse detection |
| bcryptjs | Hash kata sandi |
| cookie-parser | Refresh cookie `HttpOnly` |
| helmet, cors | HTTP hardening dan cross-origin policy |
| express-rate-limit | Rate limiter global dan autentikasi |
| morgan | Request logging pada development |
| Cloudinary Node SDK | Object storage dan transformasi gambar |
| Multer | Parsing multipart di memory dengan batas ukuran |
| nodemon | Development reload |

## Arsitektur

```text
HTTP request
    ↓
routes/          path, auth, RBAC, validation, rate limit
    ↓
controllers/     HTTP input/output dan status code
    ↓
services/        aturan bisnis dan transaksi
    ↓
repositories/    SQL berparameter
    ↓
PostgreSQL
```

Error dari seluruh lapisan diteruskan ke error middleware pusat dan diubah menjadi envelope API konsisten.

## Struktur direktori

```text
backend/
├── postman/             # Koleksi dan environment Postman
├── scripts/             # HTTP/database smoke suites
├── src/
│   ├── config/          # Environment, cookie, dan pool database
│   ├── constants/       # Error code stabil
│   ├── controllers/     # HTTP handlers
│   ├── database/        # Schema, migration, inspection, dan seed
│   ├── middleware/      # Auth, RBAC, validation, rate limit, error
│   ├── repositories/    # PostgreSQL data access
│   ├── routes/          # Route registration
│   ├── services/        # Business logic dan transaksi
│   ├── utils/           # ApiError, response, crypto, pagination
│   └── validators/      # Validator request per domain
├── test/                # Unit test backend
├── .env.example
└── package.json
```

## Autentikasi dan sesi

### Access token

- JWT dikirim melalui `Authorization: Bearer <token>`.
- TTL bawaan 900 detik.
- Klaim memuat ID, email, dan peran.
- Issuer dan audience diverifikasi saat token dibaca.

### Refresh token

- Token acak opaque; database hanya menyimpan hash SHA-256.
- Browser menerima token melalui cookie `HttpOnly`.
- Cookie dibatasi ke path `/api/v1/auth`.
- Refresh token dirotasi setiap digunakan.
- Penggunaan kembali token yang sudah dirotasi mencabut seluruh token dalam family yang sama.
- Endpoint sesi memungkinkan pengguna melihat sesi dan logout dari seluruh perangkat.

### Password

- Password disimpan sebagai hash bcrypt.
- Validator registrasi/perubahan password memeriksa panjang, kombinasi karakter, pola lemah, dan bagian identitas.
- Login yang gagal dilacak per akun; akun dapat dikunci sementara sesuai konfigurasi.
- Token reset password disimpan sebagai hash dan hanya dapat dipakai sekali.

## Authorization

Peran backend adalah:

| Peran | Akses utama |
| --- | --- |
| `user` | Pembelajaran, progres, submit kuis, profil, dashboard sendiri |
| `admin` | Administrasi pengguna/konten, laporan, statistik, bank kata |

Registrasi publik membuat `user`. Middleware `authenticate`, `requireUser`, dan `requireAdmin` dipasang pada route yang relevan. Admin sengaja tidak dapat menulis progres atau submit kuis karena data tersebut hanya mewakili pembelajar.

## Database

### Entitas utama

| Entitas | Fungsi |
| --- | --- |
| `roles`, `users` | Identitas, peran, profil, dan status akun |
| `refresh_tokens` | Sesi, family rotation, revocation, dan expiry |
| `password_reset_tokens` | Reset kata sandi sekali pakai |
| `courses`, `lessons` | Struktur materi berurutan |
| `quizzes`, `quiz_questions` | Kuis dan pertanyaan |
| `lesson_progress`, `quiz_results` | Status belajar dan riwayat nilai |
| `translations` | Bank kata, alias, gambar, dan video BISINDO |

Foreign key memakai cascade atau set-null sesuai relasi. Kolom terstruktur seperti options dan answers memakai JSONB; aliases bank kata memakai array PostgreSQL.

### Database baru

`schema.sql` membuat struktur lengkap. Perintah membutuhkan `psql` dan
`DATABASE_URL` pada environment shell; `psql` tidak membaca `backend/.env`
secara otomatis:

```bash
cd backend
export DATABASE_URL='postgresql://USER:PASSWORD@HOST:PORT/DATABASE'
npm run db:schema
npm run seed
npm run seed:wordbank
```

### Database yang sudah berisi data

`migrate.sql` adalah migrasi transaksional, idempoten, dan non-destruktif untuk menambah struktur yang belum tersedia:

```bash
cd backend
export DATABASE_URL='postgresql://USER:PASSWORD@HOST:PORT/DATABASE'
npm run db:migrate
npm run seed
npm run seed:wordbank
```

Jangan menjalankan `schema.sql` sebagai pengganti migrasi pada database yang harus dipertahankan tanpa meninjau dampaknya.

### Seed administrator

Seed membaca:

- `SEED_ADMIN_EMAIL` — bawaan `admin@signlearn.local`;
- `SEED_ADMIN_NAME` — bawaan `Administrator`;
- `SEED_ADMIN_PASSWORD` — opsional.
- `SEED_ALLOW_PRODUCTION` — override eksplisit yang harus bernilai `true` bila
  seed memang sengaja dijalankan dengan `NODE_ENV=production`.

Jika password kosong, script membuat password kuat dan menampilkannya satu kali. Tidak ada password admin bawaan yang disimpan di repository.

### Seed Bank Kata

`npm run seed:wordbank` melakukan upsert idempoten atas kata awal yang
dikelompokkan ke kategori Sapaan, Keluarga, Sekolah, Perasaan, dan Kegiatan
Harian. Setiap entri menyimpan ejaan A-Z dan tidak memasang URL media palsu.
Perintah ini juga membersihkan media rusak pada entri seed yang sudah ada tanpa
menghapus ID barisnya.

## Environment variables

Gunakan [`.env.example`](.env.example) sebagai sumber konfigurasi lengkap.

### Runtime dan database

| Variabel | Wajib | Fungsi |
| --- | --- | --- |
| `NODE_ENV` | Tidak | `development`, `test`, atau `production` |
| `PORT` | Tidak | Port HTTP; template memakai `4788` |
| `API_PREFIX` | Tidak | Prefix API; template memakai `/api/v1` |
| `DATABASE_URL` | Ya | PostgreSQL connection string |
| `DB_POOL_MAX` | Tidak | Maksimum koneksi pool |
| `DB_SSL` | Tidak | Aktifkan SSL database |
| `DB_SSL_REJECT_UNAUTHORIZED` | Tidak | Verifikasi sertifikat database |

Untuk Supabase, template merekomendasikan transaction pooler port `6543`. Percent-encode karakter khusus pada password di dalam URL.

### Token dan cookie

| Variabel | Fungsi |
| --- | --- |
| `JWT_ACCESS_SECRET` | Secret HMAC minimal 32 karakter; wajib di production |
| `JWT_ACCESS_TTL_SECONDS` | TTL access token |
| `JWT_ISSUER`, `JWT_AUDIENCE` | Identitas penerbit dan audience JWT |
| `REFRESH_TTL_DAYS` | Masa aktif refresh token |
| `REFRESH_COOKIE_NAME` | Nama cookie refresh |
| `COOKIE_SECURE` | Kirim cookie hanya melalui HTTPS |
| `COOKIE_SAME_SITE` | SameSite cookie |
| `COOKIE_DOMAIN` | Domain cookie opsional |

Pada development, backend membuat JWT secret acak sementara jika `JWT_ACCESS_SECRET` kosong. Akibatnya seluruh sesi menjadi tidak valid setelah restart. Isi secret stabil untuk development berkelanjutan.

### Penyimpanan gambar Cloudinary

| Variabel | Fungsi |
| --- | --- |
| `CLOUDINARY_CLOUD_NAME` | Nama cloud Cloudinary |
| `CLOUDINARY_API_KEY` | API key server-side |
| `CLOUDINARY_API_SECRET` | API secret server-side; jangan pernah dikirim ke frontend |
| `CLOUDINARY_FOLDER` | Folder induk aset, bawaan `signlearn` |
| `UPLOAD_IMAGE_MAX_BYTES` | Batas upload, bawaan 5 MiB |

Ketiga kredensial wajib di production dan harus diisi bersama. Upload hanya
menerima satu field multipart bernama `image` dengan format JPEG, PNG, atau
WebP. Backend memeriksa MIME serta magic bytes, melakukan signed upload, lalu
menyimpan URL HTTPS dan public ID untuk cleanup ketika aset diganti atau data
dihapus.

### Keamanan, CORS, seed, dan feature flags

| Variabel | Fungsi |
| --- | --- |
| `BCRYPT_ROUNDS` | Cost hash password |
| `MAX_FAILED_LOGINS`, `LOCKOUT_MINUTES` | Kebijakan penguncian akun |
| `PASSWORD_RESET_TTL_MINUTES` | Masa aktif token reset |
| `CORS_ORIGINS` | Daftar origin frontend dipisahkan koma |
| `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX` | Rate limit global |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_NAME`, `SEED_ADMIN_PASSWORD` | Akun admin seed |
| `SEED_ALLOW_PRODUCTION` | Izin eksplisit menjalankan seed di production |
| `AI_SUBTITLE_ENABLED`, `AI_QUIZ_GENERATOR_ENABLED` | Feature flag placeholder AI admin |

`CORS_ORIGINS` wajib di production. `COOKIE_SECURE` juga harus `true` pada deployment HTTPS.

## Instalasi

```bash
npm --prefix backend install
cp backend/.env.example backend/.env
```

Buat secret:

```bash
npm --prefix backend run gen:secret
```

Masukkan hasilnya ke `backend/.env`, bukan ke source code atau dokumentasi.

## Menjalankan server

Dari root:

```bash
npm run dev:backend
```

Atau dari `backend/`:

```bash
npm run dev
```

Mode production:

```bash
npm --prefix backend start
```

Dengan template environment, API tersedia pada `http://localhost:4788/api/v1` dan health check pada `http://localhost:4788/api/health`.

## API overview

Tabel berikut merangkum seluruh route yang terdaftar. Path selain health check berada di bawah `/api/v1`.

### Health dan authentication

| Method | Endpoint | Deskripsi | Akses |
| --- | --- | --- | --- |
| GET | `/api/health` | Status server, database, uptime | Publik |
| POST | `/auth/register` | Registrasi akun `user` | Publik |
| POST | `/auth/login` | Login dan penerbitan sesi | Publik |
| POST | `/auth/refresh` | Rotasi refresh token | Refresh cookie |
| POST | `/auth/logout` | Cabut sesi saat ini | Refresh cookie bila ada |
| POST | `/auth/forgot-password` | Buat permintaan reset | Publik |
| POST | `/auth/reset-password` | Gunakan token reset | Publik |
| GET | `/auth/me` | Pengguna aktif | Auth |
| GET | `/auth/sessions` | Daftar sesi pengguna | Auth |
| POST | `/auth/logout-all` | Cabut seluruh sesi | Auth |
| POST | `/auth/change-password` | Ganti password aktif | Auth |

### Users

| Method | Endpoint | Deskripsi | Akses |
| --- | --- | --- | --- |
| GET, PUT | `/users/profile` | Baca/perbarui profil sendiri | Auth |
| POST | `/users/profile/avatar` | Upload/ganti foto profil | Auth |
| GET | `/users` | List/filter pengguna | Admin |
| GET, PUT, DELETE | `/users/:id` | Detail, update, atau nonaktifkan pengguna | Admin |

### Courses, lessons, quizzes, dan questions

| Method | Endpoint | Deskripsi | Akses |
| --- | --- | --- | --- |
| GET | `/courses/categories` | Kategori kursus | Publik |
| GET | `/courses` | List kursus; progres bila terautentikasi | Publik/opsional auth |
| GET | `/courses/:id` | Detail kursus | Publik/opsional auth |
| POST, PUT, DELETE | `/courses`, `/courses/:id` | CRUD kursus | Admin |
| POST | `/courses/:id/thumbnail` | Upload/ganti thumbnail kursus | Admin |
| GET | `/courses/:courseId/lessons` | List pelajaran suatu kursus | Publik/opsional auth |
| GET | `/courses/:courseId/lessons/:lessonId` | Detail pelajaran | Publik/opsional auth |
| POST, PUT, DELETE | `/courses/:courseId/lessons[...]` | CRUD pelajaran bersarang | Admin |
| PATCH | `/courses/:courseId/lessons/reorder` | Ubah urutan pelajaran | Admin |
| GET | `/lessons/:id` | Detail pelajaran langsung | Publik/opsional auth |
| POST, PUT, DELETE | `/lessons`, `/lessons/:id` | CRUD pelajaran datar untuk CMS | Admin |
| GET | `/courses/:courseId/quizzes` | List kuis | Publik/opsional auth |
| GET | `/courses/:courseId/quizzes/:quizId` | Detail kuis | Publik/opsional auth |
| POST, PUT, DELETE | `/courses/:courseId/quizzes[...]` | CRUD kuis | Admin |
| POST | `/courses/:courseId/quizzes/:quizId/submit` | Submit jawaban dan simpan hasil | User |
| GET, POST | `/courses/:courseId/quizzes/:quizId/questions` | List/buat pertanyaan | Admin |
| PUT, DELETE | `/courses/:courseId/quizzes/:quizId/questions/:questionId` | Update/hapus pertanyaan | Admin |
| PATCH | `/courses/:courseId/quizzes/:quizId/questions/reorder` | Ubah urutan pertanyaan | Admin |

`[...]` pada tabel adalah ringkasan pola route, bukan endpoint literal. Gunakan koleksi Postman atau source route untuk path lengkap.

### Progress, dashboard, admin, dan translations

| Method | Endpoint | Deskripsi | Akses |
| --- | --- | --- | --- |
| GET | `/progress` | Progres pengguna aktif | User |
| GET | `/progress/courses/:courseId` | Status akses pelajaran | User |
| PUT | `/progress/lessons/:lessonId` | Update progres pelajaran | User |
| GET | `/dashboard/me` | Dashboard pembelajar | Auth |
| GET | `/dashboard/admin` | Dashboard administrator | Admin |
| GET | `/dashboard/admin/reports` | Laporan dengan filter tanggal | Admin |
| GET | `/admin/stats` | Statistik admin | Admin |
| GET | `/admin/activities` | Feed aktivitas | Admin |
| GET | `/admin/quiz-results` | Hasil kuis lintas pengguna | Admin |
| POST | `/admin/ai/subtitles/:lessonId` | Placeholder subtitle AI | Admin; `501` |
| POST | `/admin/ai/quiz/:lessonId` | Placeholder generator kuis | Admin; `501` |
| GET | `/translations/lookup` | Lookup kata/alias aktif | Publik |
| GET | `/translations/categories` | Kategori bank kata | Publik/opsional auth |
| GET | `/translations` | List/search/filter bank kata | Publik/opsional auth |
| GET | `/translations/:id` | Detail terjemahan | Publik/opsional auth |
| POST, PUT, DELETE | `/translations`, `/translations/:id` | CRUD bank kata | Admin |
| POST | `/translations/:id/image` | Upload/ganti gambar bank kata | Admin |

Dokumentasi request, example response, auth variables, dan skenario negatif tersedia di [panduan Postman](postman/README.md).

## Validasi dan error handling

Validator mengembalikan error per field sebelum controller dijalankan. Backend juga menerjemahkan error JWT, PostgreSQL, payload terlalu besar, dan JSON rusak menjadi respons yang stabil.

Respons sukses:

```json
{
  "success": true,
  "message": "...",
  "data": {}
}
```

Respons error:

```json
{
  "success": false,
  "status": 422,
  "code": "VALIDATION_FAILED",
  "message": "Data yang dikirim tidak valid.",
  "errors": [
    { "field": "email", "message": "..." }
  ]
}
```

Stack trace hanya dapat disertakan pada error server di non-production dan tidak dikirim pada production.

## Rate limiting

Backend memiliki limiter global dan limiter khusus untuk:

- login per IP;
- login per email;
- registrasi;
- forgot password;
- refresh token.

Limiter dilewati ketika `NODE_ENV=test` agar smoke suite tidak saling mengganggu.

## Testing

### Unit test

```bash
npm --prefix backend test
```

Test yang saat ini tersedia memeriksa validasi dan normalisasi bank kata tanpa database.

### Smoke suites

Smoke suites menembak server dan PostgreSQL nyata:

```bash
npm --prefix backend run smoke:auth
npm --prefix backend run smoke:password-reset
npm --prefix backend run smoke:cloudinary
npm --prefix backend run smoke:users
npm --prefix backend run smoke:content
npm --prefix backend run smoke:dashboard
npm --prefix backend run smoke:db
npm --prefix backend run smoke:all
```

`smoke:password-reset` menyalakan aplikasi pada port acak, membuat akun uji,
memastikan kode tidak bocor lewat HTTP, mengganti hash di PostgreSQL, menguji
login lama/baru dan replay kode, lalu menghapus akun uji. `smoke:db` menguji
transaksi repository secara langsung. `smoke:cloudinary` mengunggah melalui
endpoint profil, kursus, dan bank kata, memeriksa URL CDN dan public ID di
PostgreSQL, menguji replace/delete, lalu membersihkan seluruh aset dan data uji.
Ketiganya menyalakan atau mengakses dependensinya sendiri tanpa server yang
sudah berjalan, tetapi tetap menulis sementara ke database yang dikonfigurasi.

Prasyarat:

1. Untuk suite selain `smoke:password-reset`, `smoke:cloudinary`, dan
   `smoke:db`, server berjalan dengan `NODE_ENV=test`.
2. Database test sudah mendapat schema/migration dan seed.
3. `SEED_ADMIN_PASSWORD` tersedia pada environment proses test.
4. `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, dan
   `CLOUDINARY_API_SECRET` tersedia untuk `smoke:cloudinary`; suite ini memakai
   provider nyata dan membutuhkan koneksi internet.

Gunakan PostgreSQL throwaway. Contoh lokal dengan Docker:

```bash
docker run -d --name signlearn-test-db \
  -e POSTGRES_PASSWORD=testpw \
  -e POSTGRES_DB=signlearn \
  -p 55433:5432 \
  postgres:16-alpine
```

Docker bukan dependency repository dan tidak ada `docker-compose.yml`; perintah di atas hanya contoh menyediakan database test eksternal.

### Postman/Newman

```bash
cd backend
npx newman@6 run postman/SignLearn-API.postman_collection.json \
  -e postman/SignLearn-Local.postman_environment.json \
  --env-var "adminPassword=RAHASIA"
```

Lihat [`postman/README.md`](postman/README.md) sebelum mengaktifkan request destruktif.

## Troubleshooting

### `DATABASE_URL wajib diisi`

Pastikan file berada di `backend/.env` ketika server dijalankan dari `backend/`, atau ekspor variabel ke environment shell. Root `npm run dev` menjalankan npm dengan prefix backend sehingga dotenv membaca konfigurasi tersebut dari working directory backend.

### Database tidak dapat dijangkau

- Periksa host, port, nama database, dan password.
- Percent-encode karakter khusus pada password URL.
- Untuk Supabase bersama, gunakan transaction pooler port `6543`.
- Sesuaikan `DB_SSL` dengan server PostgreSQL yang digunakan.

### Login gagal karena CORS

Pada production, pastikan `CORS_ORIGINS` memuat origin frontend secara tepat;
`localhost` dan `127.0.0.1` adalah origin berbeda. Development menerima origin
secara dinamis. Bila port backend berubah, perbarui juga
`VITE_API_BASE_URL` frontend.

### Sesi hilang setelah restart

Isi `JWT_ACCESS_SECRET` stabil minimal 32 karakter. Secret acak development berubah setiap proses dimulai.

### Smoke suite menerima `429`

Jalankan server dengan `NODE_ENV=test`, bukan hanya proses smoke test. Rate limiter hidup di proses server.

### Git Bash mengubah `/api/v1`

Pada Git Bash Windows, set `MSYS2_ENV_CONV_EXCL='*'` sebelum menjalankan server agar `API_PREFIX=/api/v1` tidak dikonversi menjadi path Windows.

## Status implementasi

Backend akun, pengguna, kursus, pelajaran, kuis, progres, dashboard, laporan, translations, dan upload media Cloudinary telah memiliki route, controller, service, serta repository PostgreSQL. Dua endpoint AI administratif masih placeholder dan sengaja membalas `501`. Modul job yang disebut di panduan Postman belum tersedia sebagai route backend.

## Dokumentasi terkait

- [Dokumentasi utama](../README.md)
- [Frontend](../frontend/README.md)
- [AI](../ai/README.md)
- [Postman](postman/README.md)
- [Testing report](../TESTING_REPORT.md)
