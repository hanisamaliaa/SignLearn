-- ============================================================
-- SignLearn — Migrasi non-destruktif
--
--   ✅ AMAN dijalankan pada database yang sudah berisi data.
--   ✅ Idempoten — boleh dijalankan berulang kali.
--   ✅ Transaksional — gagal di tengah = tidak ada perubahan sama sekali.
--   ❌ TIDAK menghapus tabel, kolom, atau baris apa pun.
--
-- Pakai skrip ini bila `courses` (atau tabel lain) sudah berisi data yang
-- masih dibutuhkan. Bila database masih kosong, `schema.sql` lebih bersih.
--
-- ── Kenapa urutannya CREATE TABLE → ADD COLUMN → CREATE INDEX ──
--
-- Inilah yang memperbaiki ERROR 42703 sebelumnya. `CREATE TABLE IF NOT EXISTS`
-- melewati tabel yang sudah ada tanpa memeriksa bentuknya, sehingga kolom baru
-- tidak pernah ditambahkan — lalu CREATE INDEX gagal karena kolomnya tiada.
--
-- Tahap ADD COLUMN di tengah menutup celah itu: apapun kondisi awal tabel,
-- setelah tahap 2 seluruh kolom dijamin ada sebelum index dibuat.
-- ============================================================

BEGIN;

-- ═══ TAHAP 0 — fungsi trigger ═══════════════════════════════════
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ═══ TAHAP 1 — buat tabel yang belum ada ════════════════════════
-- Tabel yang SUDAH ada dilewati; bentuknya diperbaiki di Tahap 2.

CREATE TABLE IF NOT EXISTS roles (
  id          INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        VARCHAR(50) NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name           VARCHAR(120) NOT NULL,
  email          VARCHAR(190) NOT NULL,
  password_hash  VARCHAR(255) NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     BIGINT NOT NULL,
  token_hash  CHAR(64) NOT NULL UNIQUE,
  family_id   UUID NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     BIGINT NOT NULL,
  token_hash  CHAR(64) NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS courses (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title       VARCHAR(190) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lessons (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  course_id   BIGINT NOT NULL,
  title       VARCHAR(190) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quizzes (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  course_id   BIGINT NOT NULL,
  title       VARCHAR(190) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quiz_questions (
  id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  quiz_id  BIGINT NOT NULL,
  question TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS lesson_progress (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    BIGINT NOT NULL,
  lesson_id  BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS quiz_results (
  id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id  BIGINT NOT NULL,
  quiz_id  BIGINT NOT NULL,
  score    INT NOT NULL DEFAULT 0
);


-- ═══ TAHAP 2 — lengkapi kolom yang hilang ═══════════════════════
-- `ADD COLUMN IF NOT EXISTS` melewati kolom yang sudah ada, sehingga
-- data existing tidak tersentuh sama sekali.

-- ── users ──────────────────────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id               INT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone                 VARCHAR(30);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar                VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile               VARCHAR(50) DEFAULT 'general';
ALTER TABLE users ADD COLUMN IF NOT EXISTS status                VARCHAR(20) DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts SMALLINT    DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until          TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS join_date             DATE        DEFAULT CURRENT_DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at            TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at            TIMESTAMPTZ DEFAULT NOW();

-- ── refresh_tokens ─────────────────────────────────────────────
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS rotated_at TIMESTAMPTZ;
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS user_agent VARCHAR(255);
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS ip_address INET;

-- ── password_reset_tokens ──────────────────────────────────────
ALTER TABLE password_reset_tokens ADD COLUMN IF NOT EXISTS used_at TIMESTAMPTZ;

-- ── courses ── (inilah yang menyebabkan ERROR 42703) ───────────
ALTER TABLE courses ADD COLUMN IF NOT EXISTS title_en        VARCHAR(190);
ALTER TABLE courses ADD COLUMN IF NOT EXISTS category        VARCHAR(100);
ALTER TABLE courses ADD COLUMN IF NOT EXISTS level           VARCHAR(20)  DEFAULT 'Pemula';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS description     TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS thumbnail       VARCHAR(500);
ALTER TABLE courses ADD COLUMN IF NOT EXISTS total_lessons   INT          DEFAULT 0;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC(4,1) DEFAULT 0;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_locked       BOOLEAN      DEFAULT FALSE;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS sort_order      INT          DEFAULT 0;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS created_at      TIMESTAMPTZ  DEFAULT NOW();
ALTER TABLE courses ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMPTZ  DEFAULT NOW();

-- ── lessons ────────────────────────────────────────────────────
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS duration    VARCHAR(30);
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS video_url   VARCHAR(500);
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS sort_order  INT         DEFAULT 0;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS is_locked   BOOLEAN     DEFAULT FALSE;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS created_at  TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ DEFAULT NOW();

-- ── quizzes ────────────────────────────────────────────────────
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS lesson_id         BIGINT;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS total_questions   INT         DEFAULT 0;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS min_passing_score INT         DEFAULT 70;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS duration_seconds  INT         DEFAULT 300;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS created_at        TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS updated_at        TIMESTAMPTZ DEFAULT NOW();

-- ── quiz_questions ─────────────────────────────────────────────
ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS question_type VARCHAR(30) DEFAULT 'multiple-choice';
ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS options       JSONB       DEFAULT '[]'::jsonb;
ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS correct_index INT         DEFAULT 0;
ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS sort_order    INT         DEFAULT 0;

-- ── lesson_progress ────────────────────────────────────────────
ALTER TABLE lesson_progress ADD COLUMN IF NOT EXISTS status       VARCHAR(20) DEFAULT 'not_started';
ALTER TABLE lesson_progress ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE lesson_progress ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMPTZ DEFAULT NOW();

-- ── quiz_results ───────────────────────────────────────────────
ALTER TABLE quiz_results ADD COLUMN IF NOT EXISTS passed   BOOLEAN     DEFAULT FALSE;
ALTER TABLE quiz_results ADD COLUMN IF NOT EXISTS answers  JSONB;
ALTER TABLE quiz_results ADD COLUMN IF NOT EXISTS taken_at TIMESTAMPTZ DEFAULT NOW();


-- ═══ TAHAP 3 — perbaiki tipe kolom ══════════════════════════════
-- estimated_hours perlu desimal agar "2,5 jam" dapat disimpan.
-- INTEGER → NUMERIC selalu aman; tidak ada data yang hilang.
ALTER TABLE courses
  ALTER COLUMN estimated_hours TYPE NUMERIC(4,1)
  USING COALESCE(estimated_hours, 0)::NUMERIC(4,1);


-- ═══ TAHAP 4 — isi data wajib sebelum constraint dipasang ═══════
INSERT INTO roles (name) VALUES ('admin'), ('user')
ON CONFLICT (name) DO NOTHING;

-- Baris users lama mungkin belum punya role_id. Diisi 'user' agar
-- constraint NOT NULL di bawah tidak gagal.
UPDATE users
   SET role_id = (SELECT id FROM roles WHERE name = 'user')
 WHERE role_id IS NULL;

-- Isi nilai default pada baris lama yang kolomnya baru ditambahkan.
UPDATE courses SET level      = 'Pemula' WHERE level IS NULL;
UPDATE courses SET sort_order = 0        WHERE sort_order IS NULL;
UPDATE users   SET status     = 'active' WHERE status IS NULL;
UPDATE users   SET profile    = 'general' WHERE profile IS NULL;


-- ═══ TAHAP 5 — constraint & foreign key ═════════════════════════
-- Dibungkus DO block karena Postgres tidak punya
-- "ADD CONSTRAINT IF NOT EXISTS"; menjalankan ulang akan error tanpa ini.
DO $$
BEGIN
  -- Foreign key
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_users_role') THEN
    ALTER TABLE users ADD CONSTRAINT fk_users_role
      FOREIGN KEY (role_id) REFERENCES roles(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_refresh_user') THEN
    ALTER TABLE refresh_tokens ADD CONSTRAINT fk_refresh_user
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_reset_user') THEN
    ALTER TABLE password_reset_tokens ADD CONSTRAINT fk_reset_user
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_lessons_course') THEN
    ALTER TABLE lessons ADD CONSTRAINT fk_lessons_course
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_quizzes_course') THEN
    ALTER TABLE quizzes ADD CONSTRAINT fk_quizzes_course
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_questions_quiz') THEN
    ALTER TABLE quiz_questions ADD CONSTRAINT fk_questions_quiz
      FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_progress_user') THEN
    ALTER TABLE lesson_progress ADD CONSTRAINT fk_progress_user
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_progress_lesson') THEN
    ALTER TABLE lesson_progress ADD CONSTRAINT fk_progress_lesson
      FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_user_lesson') THEN
    ALTER TABLE lesson_progress ADD CONSTRAINT uq_user_lesson
      UNIQUE (user_id, lesson_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_results_user') THEN
    ALTER TABLE quiz_results ADD CONSTRAINT fk_results_user
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_results_quiz') THEN
    ALTER TABLE quiz_results ADD CONSTRAINT fk_results_quiz
      FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE;
  END IF;

  -- CHECK constraint
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_users_profile') THEN
    ALTER TABLE users ADD CONSTRAINT chk_users_profile
      CHECK (profile IN ('parent', 'deaf', 'general'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_users_status') THEN
    ALTER TABLE users ADD CONSTRAINT chk_users_status
      CHECK (status IN ('active', 'inactive', 'suspended'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_courses_level') THEN
    ALTER TABLE courses ADD CONSTRAINT chk_courses_level
      CHECK (level IN ('Pemula', 'Menengah', 'Lanjutan'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_progress_status') THEN
    ALTER TABLE lesson_progress ADD CONSTRAINT chk_progress_status
      CHECK (status IN ('not_started', 'in_progress', 'completed'));
  END IF;
END $$;

-- NOT NULL dipasang setelah Tahap 4 mengisi nilainya.
ALTER TABLE users   ALTER COLUMN role_id    SET NOT NULL;
ALTER TABLE users   ALTER COLUMN status     SET NOT NULL;
ALTER TABLE users   ALTER COLUMN profile    SET NOT NULL;
ALTER TABLE courses ALTER COLUMN level      SET NOT NULL;
ALTER TABLE courses ALTER COLUMN sort_order SET NOT NULL;


-- ═══ TAHAP 6 — index ════════════════════════════════════════════
-- Terakhir, setelah seluruh kolom dijamin ada. Inilah yang gagal
-- pada percobaan sebelumnya.
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email_lower  ON users (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_role         ON users (role_id);
CREATE INDEX IF NOT EXISTS idx_users_status       ON users (status);
CREATE INDEX IF NOT EXISTS idx_refresh_user       ON refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_family     ON refresh_tokens (family_id);
CREATE INDEX IF NOT EXISTS idx_refresh_expires    ON refresh_tokens (expires_at);
CREATE INDEX IF NOT EXISTS idx_reset_user         ON password_reset_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_courses_sort       ON courses (sort_order);
CREATE INDEX IF NOT EXISTS idx_lessons_course     ON lessons (course_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_quizzes_course     ON quizzes (course_id);
CREATE INDEX IF NOT EXISTS idx_questions_quiz     ON quiz_questions (quiz_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_progress_user      ON lesson_progress (user_id);
CREATE INDEX IF NOT EXISTS idx_results_user       ON quiz_results (user_id, taken_at DESC);


-- ═══ TAHAP 7 — trigger updated_at ═══════════════════════════════
DROP TRIGGER IF EXISTS trg_users_updated_at   ON users;
DROP TRIGGER IF EXISTS trg_courses_updated_at ON courses;
DROP TRIGGER IF EXISTS trg_lessons_updated_at ON lessons;
DROP TRIGGER IF EXISTS trg_quizzes_updated_at ON quizzes;

CREATE TRIGGER trg_users_updated_at   BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_courses_updated_at BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_lessons_updated_at BEFORE UPDATE ON lessons
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_quizzes_updated_at BEFORE UPDATE ON quizzes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;

-- ── Verifikasi ─────────────────────────────────────────────────
SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
 WHERE table_schema = 'public' AND table_name = 'courses'
 ORDER BY ordinal_position;
