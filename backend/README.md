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
# edit .env and set DB_* and a strong JWT_SECRET

# 3. Run the dev server (nodemon)
npm run dev
```

The server starts on `http://localhost:5000` (or `PORT` from `.env`). It will
report a warning if the database is unreachable but will **not** crash.

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

## Remaining Manual Tasks

1. Implement MySQL queries in `src/repositories/*`.
2. Wire services to repositories (replace `throw new ApiError(501, ...)`).
3. Apply `src/database/schema.sql` in MySQL.
4. Implement refresh-token rotation & password reset email flow.
5. Integrate AI subtitle / quiz generation services.
