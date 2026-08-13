# SignLearn Backend (REST API)

Node.js + Express REST API for the SignLearn BISINDO learning platform.

> **Status:** Architecture only. The API skeleton, JWT auth, RBAC, and MySQL
> data layer are prepared. Database queries are **not** implemented yet — the
> server boots without a live database.

## Tech Stack

- **Node.js** + **Express** (ESM)
- **MySQL** (`mysql2/promise`) — pool prepared, queries pending
- **JWT** (`jsonwebtoken`) — access + refresh tokens
- **bcryptjs** — password hashing
- **RBAC** — `admin` / `user` roles
- **helmet, cors, express-rate-limit, morgan** — hardening & tooling

## Features (architecture)

- Authentication (register, login, refresh, forgot/reset password)
- Users management (admin)
- Courses / Lessons / Quizzes CRUD (admin)
- Learning progress (sequential course lock)
- User & Admin dashboard
- Profile update (persists)
- AI subtitle & AI quiz generator placeholders

## Business Rules

- **Sequential course lock:** a lesson is unlocked only after the previous
  lesson is completed and its quiz is passed.
- **Minimum passing score = 70** (KKM).
- **Quiz focus mode:** full-screen timer (5 min default).
- **RBAC:** users cannot access admin routes and vice-versa.

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# edit .env: set DATABASE_URL and a JWT_ACCESS_SECRET of at least 32 chars
#   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# 3. Run the dev server (nodemon)
npm run dev
```

The server starts on `http://localhost:4788` (or `PORT` from `.env`). It will
report a warning if the database is unreachable but will **not** crash.

> **Ports.** Backend `4788`, frontend `4789`. Deliberately outside the usual
> 3000/4000/5000/8080 range. Port 5000 in particular is taken by AirPlay
> Receiver on macOS, which answers with an unrelated 403 instead of refusing
> the connection.
>
> Change `PORT` here and you must also change `VITE_API_BASE_URL` in
> `frontend/.env` and `CORS_ORIGINS` here — all three have to agree, or login
> fails with an error that looks like a network or credential problem.

## Project Structure

```
backend/
└── src/
    ├── app.js            # Express app assembly
    ├── server.js         # Entry point
    ├── config/           # env + database pool
    ├── controllers/      # HTTP handlers
    ├── middleware/       # auth, rbac, error, validation
    ├── models/           # (future) entity models
    ├── repositories/     # MySQL data access (placeholders)
    ├── routes/           # route definitions
    ├── services/         # business logic (placeholders)
    ├── utils/            # ApiError, asyncHandler, responses
    ├── validators/       # request validators
    └── database/         # schema.sql + seed.js
```

## API Endpoints (planned)

| Method              | Endpoint                               | Access              |
| ------------------- | -------------------------------------- | ------------------- |
| POST                | `/api/auth/register`                   | public              |
| POST                | `/api/auth/login`                      | public              |
| POST                | `/api/auth/refresh`                    | public              |
| GET                 | `/api/auth/me`                         | user                |
| GET/PUT             | `/api/users/profile`                   | user                |
| GET/POST/PUT/DELETE | `/api/users`                           | admin               |
| GET                 | `/api/courses`                         | user                |
| GET                 | `/api/courses/:id`                     | user                |
| GET/POST/PUT/DELETE | `/api/courses/:id/lessons`             | user/admin          |
| GET/POST/PUT/DELETE | `/api/courses/:id/quizzes`             | user/admin          |
| POST                | `/api/courses/:id/quizzes/:qid/submit` | user                |
| GET/PUT             | `/api/progress`                        | user                |
| GET                 | `/api/dashboard/me`                    | user                |
| GET                 | `/api/dashboard/admin`                 | admin               |
| GET                 | `/api/admin/stats`                     | admin               |
| POST                | `/api/admin/ai/subtitles/:lessonId`    | admin (placeholder) |
| POST                | `/api/admin/ai/quiz/:lessonId`         | admin (placeholder) |

## Postman

Koleksi resmi ada di [`postman/`](postman/) — 63 request yang mencakup **54 dari 54 rute**, lengkap dengan deskripsi, contoh respons, dan 238 assertion otomatis.

```bash
npx newman@6 run postman/SignLearn-API.postman_collection.json -e postman/SignLearn-Local.postman_environment.json --env-var "adminPassword=RAHASIA"
```

Lihat [`postman/README.md`](postman/README.md) untuk gerbang `runDestructive`, penanganan cookie refresh, dan jebakan identifier `data` di sandbox Postman.

## Testing

Seluruh test menembak API yang **benar-benar berjalan** lewat HTTP dan
PostgreSQL sungguhan — tidak ada mock. Yang ingin dibuktikan justru bahwa
Express, middleware, dan database bekerja sebagai satu kesatuan.

```bash
npm run smoke:all
```

| Perintah | Cakupan |
|---|---|
| `npm run smoke:auth` | Register, login, rotasi & deteksi pencurian refresh token, kebijakan kata sandi |
| `npm run smoke:users` | Profil sendiri, admin CRUD, penjaga self-demote & admin terakhir (§7) |
| `npm run smoke:content` | Courses, lessons, quizzes, progress, buka-kunci pelajaran (§8, §10.1-10.2) |
| `npm run smoke:dashboard` | Dashboard pengguna & admin, laporan, feed aktivitas (§10.3-10.6) |
| `npm run smoke:db` | Cakupan transaksi di tingkat repository — tidak dapat diuji lewat HTTP |
| `npm run smoke:all` | Seluruhnya, berurutan |

**Prasyarat:**

1. Server berjalan — jalankan dengan **`NODE_ENV=test`**.
2. Database sudah di-`npm run seed`.
3. `SEED_ADMIN_PASSWORD` ada di environment (test admin membutuhkannya).

> **Kenapa `NODE_ENV=test` untuk server.** Rate limiter register dibatasi
> 3 pendaftaran per JAM per IP. Suite ini membuat lebih dari itu, jadi pada
> server biasa ia berhenti di tengah dengan `429` — kegagalan yang terlihat
> seperti bug padahal justru bukti limiternya bekerja. `NODE_ENV=test`
> mematikan seluruh limiter (lihat `rateLimit.middleware.js`).

### Menguji terhadap PostgreSQL throwaway

Menjalankan test terhadap database pengembangan akan mengotorinya dengan akun
dan kursus uji. Database sekali pakai lebih bersih:

```bash
docker run -d --name signlearn-test-db -e POSTGRES_PASSWORD=testpw -e POSTGRES_DB=signlearn -p 55433:5432 postgres:16-alpine
```

Arahkan `DATABASE_URL` ke `postgresql://postgres:testpw@127.0.0.1:55433/signlearn`
dengan `DB_SSL=false`, terapkan `src/database/schema.sql`, lalu `npm run seed`.

> **Git Bash di Windows.** Setel `MSYS2_ENV_CONV_EXCL='*'` sebelum menjalankan
> server. Tanpa itu, MSYS mengubah `API_PREFIX=/api/v1` menjadi path Windows
> (`C:/Program Files/Git/api/v1`) dan seluruh rute menjadi 404 tanpa satu pun
> pesan error.

## Remaining Manual Tasks

1. **Rotasi kata sandi database Supabase** — kata sandi lama pernah muncul di
   transkrip sesi. Project Settings → Database → Reset database password, lalu
   perbarui `DATABASE_URL` di `.env`.
2. Jalankan `npm run smoke:all` terhadap Supabase untuk memastikan paritas
   dengan lingkungan produksi.
3. Migrasikan frontend ke autentikasi baru: `withCredentials: true`, access
   token di memori (bukan `localStorage`), dan interceptor respons yang
   otomatis me-refresh saat menerima `TOKEN_EXPIRED`.
4. Integrasikan layanan AI subtitle & pembuat kuis (§10.8). Endpoint-nya sudah
   ada dan dijaga admin; keduanya membalas `501 NOT_IMPLEMENTED` sampai
   bendera `AI_SUBTITLE_ENABLED` / `AI_QUIZ_GENERATOR_ENABLED` dinyalakan dan
   `src/services/aiService.js` diisi.
5. Modul Dictionary & Translate (§9) dan Practice (§10.9-10.10) belum ada —
   termasuk tabelnya. `dashboard/me.practice` bernilai `null` sampai itu dibuat.
