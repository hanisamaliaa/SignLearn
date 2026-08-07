-- ============================================================
-- SignLearn — PostgreSQL schema (Supabase)
--
--   ⚠  SKRIP INI MENGHAPUS DAN MEMBUAT ULANG SELURUH TABEL.
--      Jalankan `inspect.sql` lebih dulu untuk memastikan tidak ada
--      data yang masih dibutuhkan.
--
-- Jalankan di Supabase SQL Editor, atau:
--   psql "$DATABASE_URL" -f src/database/schema.sql
--
-- Konvensi:
--   · Kolom snake_case; repository memetakan ke camelCase (API Contract §2.5)
--   · id BIGINT identity; dikirim ke API sebagai STRING (API Contract §2.6)
--   · Seluruh timestamp TIMESTAMPTZ, disimpan UTC
--
-- ── Kenapa DROP, bukan "CREATE TABLE IF NOT EXISTS" ────────────
--
-- Klausa IF NOT EXISTS membuat skrip TERLIHAT idempoten, padahal ia diam-diam
-- melewati tabel yang sudah ada meski bentuknya berbeda. Akibatnya:
--
--     CREATE TABLE IF NOT EXISTS courses (... sort_order ...);   <- DILEWATI
--     CREATE INDEX idx_courses_sort ON courses (sort_order);     <- ERROR 42703
--
-- Errornya muncul jauh dari penyebabnya dan menyesatkan. Selama skema masih
-- berubah-ubah dan belum ada data produksi, membuat ulang dari nol jauh lebih
-- jujur daripada menambal tabel yang bentuknya tidak diketahui.
-- ============================================================

BEGIN;

-- ─── Bersihkan ─────────────────────────────────────────────────
-- CASCADE ikut membuang index, constraint, dan trigger milik tabel.
-- Urutan tidak penting karena CASCADE, tetapi ditulis dari yang paling
-- bergantung ke yang paling dasar agar mudah dibaca.
DROP TABLE IF EXISTS quiz_results          CASCADE;
DROP TABLE IF EXISTS lesson_progress       CASCADE;
DROP TABLE IF EXISTS quiz_questions        CASCADE;
DROP TABLE IF EXISTS quizzes               CASCADE;
DROP TABLE IF EXISTS lessons               CASCADE;
DROP TABLE IF EXISTS courses               CASCADE;
DROP TABLE IF EXISTS password_reset_tokens CASCADE;
DROP TABLE IF EXISTS refresh_tokens        CASCADE;
DROP TABLE IF EXISTS users                 CASCADE;
DROP TABLE IF EXISTS roles                 CASCADE;

-- ─── Trigger updated_at ────────────────────────────────────────
-- Postgres tidak punya padanan ON UPDATE CURRENT_TIMESTAMP milik MySQL,
-- jadi disediakan lewat trigger yang dipakai ulang semua tabel.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── Users & Roles ─────────────────────────────────────────────
CREATE TABLE roles (
  id          INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        VARCHAR(50) NOT NULL UNIQUE,           -- 'admin' | 'user'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  role_id        INT NOT NULL REFERENCES roles(id),
  name           VARCHAR(120) NOT NULL,
  email          VARCHAR(190) NOT NULL,
  password_hash  VARCHAR(255) NOT NULL,
  phone          VARCHAR(30),
  avatar         VARCHAR(20),
  profile        VARCHAR(50) NOT NULL DEFAULT 'general'
                 CHECK (profile IN ('parent', 'deaf', 'general')),
  status         VARCHAR(20) NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active', 'inactive', 'suspended')),

  -- Perlindungan brute-force. Dikunci per akun, bukan hanya per IP,
  -- karena serangan terdistribusi memakai ribuan IP untuk satu email.
  failed_login_attempts SMALLINT NOT NULL DEFAULT 0,
  locked_until          TIMESTAMPTZ,

  join_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Email unik case-insensitive. Tanpa ini "Rina@x.com" dan "rina@x.com"
-- menjadi dua akun berbeda, dan pengguna tidak akan pernah paham kenapa
-- login-nya gagal.
CREATE UNIQUE INDEX uq_users_email_lower ON users (LOWER(email));
CREATE INDEX idx_users_role   ON users (role_id);
CREATE INDEX idx_users_status ON users (status);

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Refresh tokens (stateful) ─────────────────────────────────
--
-- Access token stateless (JWT, 15 menit). Refresh token STATEFUL dan
-- disimpan di sini. Tiga alasan:
--
--   1. Dapat dicabut seketika. JWT stateless tidak bisa — ia sah sampai
--      kedaluwarsa, meskipun akun sudah di-suspend.
--   2. Rotasi + deteksi pemakaian ulang (lihat kolom rotated_at).
--   3. Disimpan sebagai HASH. Bocornya database tidak memberi penyerang
--      satu pun sesi yang dapat dipakai.
CREATE TABLE refresh_tokens (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- SHA-256 dari token acak. Token mentah hanya ada di cookie klien.
  token_hash  CHAR(64) NOT NULL UNIQUE,

  -- Semua token turunan dari satu login berbagi family_id yang sama.
  -- Ketika token yang sudah dirotasi dipakai lagi (indikasi pencurian),
  -- SELURUH family dicabut sekaligus.
  family_id   UUID NOT NULL,

  expires_at  TIMESTAMPTZ NOT NULL,
  rotated_at  TIMESTAMPTZ,          -- terisi saat token ditukar
  revoked_at  TIMESTAMPTZ,          -- terisi saat dicabut paksa
  user_agent  VARCHAR(255),
  ip_address  INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_user    ON refresh_tokens (user_id);
CREATE INDEX idx_refresh_family  ON refresh_tokens (family_id);
CREATE INDEX idx_refresh_expires ON refresh_tokens (expires_at);

-- ─── Password reset tokens ─────────────────────────────────────
CREATE TABLE password_reset_tokens (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  CHAR(64) NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reset_user ON password_reset_tokens (user_id);

-- ─── Courses, Lessons, Quizzes ─────────────────────────────────
CREATE TABLE courses (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title            VARCHAR(190) NOT NULL,
  title_en         VARCHAR(190),
  category         VARCHAR(100),
  level            VARCHAR(20) NOT NULL DEFAULT 'Pemula'
                   CHECK (level IN ('Pemula', 'Menengah', 'Lanjutan')),
  description      TEXT,
  thumbnail        VARCHAR(500),
  total_lessons    INT NOT NULL DEFAULT 0,
  estimated_hours  NUMERIC(4,1) NOT NULL DEFAULT 0,
  is_locked        BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order       INT NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_courses_sort ON courses (sort_order);

CREATE TRIGGER trg_courses_updated_at
  BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE lessons (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  course_id   BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title       VARCHAR(190) NOT NULL,
  description TEXT,
  duration    VARCHAR(30),
  video_url   VARCHAR(500),
  sort_order  INT NOT NULL DEFAULT 0,
  is_locked   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lessons_course ON lessons (course_id, sort_order);

CREATE TRIGGER trg_lessons_updated_at
  BEFORE UPDATE ON lessons
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE quizzes (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  course_id         BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id         BIGINT REFERENCES lessons(id) ON DELETE SET NULL,
  title             VARCHAR(190) NOT NULL,
  total_questions   INT NOT NULL DEFAULT 0,
  min_passing_score INT NOT NULL DEFAULT 70,     -- KKM
  duration_seconds  INT NOT NULL DEFAULT 300,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_quizzes_course ON quizzes (course_id);

CREATE TRIGGER trg_quizzes_updated_at
  BEFORE UPDATE ON quizzes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE quiz_questions (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  quiz_id       BIGINT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question      TEXT NOT NULL,
  question_type VARCHAR(30) NOT NULL DEFAULT 'multiple-choice',
  options       JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_index INT NOT NULL DEFAULT 0,
  sort_order    INT NOT NULL DEFAULT 0
);

CREATE INDEX idx_questions_quiz ON quiz_questions (quiz_id, sort_order);

-- ─── Progress & Results ────────────────────────────────────────
CREATE TABLE lesson_progress (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id    BIGINT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  status       VARCHAR(20) NOT NULL DEFAULT 'not_started'
               CHECK (status IN ('not_started', 'in_progress', 'completed')),
  completed_at TIMESTAMPTZ,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_lesson UNIQUE (user_id, lesson_id)
);

CREATE INDEX idx_progress_user ON lesson_progress (user_id);

CREATE TABLE quiz_results (
  id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id  BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quiz_id  BIGINT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  score    INT NOT NULL,
  passed   BOOLEAN NOT NULL DEFAULT FALSE,
  answers  JSONB,
  taken_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_results_user ON quiz_results (user_id, taken_at DESC);

-- ─── Seed peran ────────────────────────────────────────────────
INSERT INTO roles (name) VALUES ('admin'), ('user')
ON CONFLICT (name) DO NOTHING;

COMMIT;
