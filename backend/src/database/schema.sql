-- ============================================================
-- SignLearn Database Schema (MySQL)
-- Reference schema for the repositories layer. Not auto-applied.
-- ============================================================

CREATE DATABASE IF NOT EXISTS signlearn
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE signlearn;

-- ─── Users & Roles ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,          -- 'admin' | 'user'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  role_id INT UNSIGNED NOT NULL,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(30) NULL,
  avatar VARCHAR(20) NULL,
  profile VARCHAR(50) NULL,                  -- learning profile: parent/deaf/general
  status ENUM('active','inactive','suspended') DEFAULT 'active',
  join_date DATE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- ─── Courses, Lessons, Quizzes ────────────────────────────────
CREATE TABLE IF NOT EXISTS courses (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(190) NOT NULL,
  title_en VARCHAR(190) NULL,
  category VARCHAR(100) NULL,
  level ENUM('Pemula','Menengah','Lanjutan') DEFAULT 'Pemula',
  description TEXT NULL,
  thumbnail VARCHAR(500) NULL,
  total_lessons INT UNSIGNED DEFAULT 0,
  estimated_hours DECIMAL(4,1) DEFAULT 0,
  is_locked TINYINT(1) DEFAULT 0,
  sort_order INT UNSIGNED DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lessons (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  course_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(190) NOT NULL,
  description TEXT NULL,
  duration VARCHAR(30) NULL,
  video_url VARCHAR(500) NULL,
  sort_order INT UNSIGNED DEFAULT 0,
  is_locked TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_lessons_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS quizzes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  course_id BIGINT UNSIGNED NOT NULL,
  lesson_id BIGINT UNSIGNED NULL,
  title VARCHAR(190) NOT NULL,
  total_questions INT UNSIGNED DEFAULT 0,
  min_passing_score INT UNSIGNED DEFAULT 70,   -- KKM
  duration_seconds INT UNSIGNED DEFAULT 300,   -- focus mode
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_quizzes_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  CONSTRAINT fk_quizzes_lesson FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS quiz_questions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  quiz_id BIGINT UNSIGNED NOT NULL,
  question TEXT NOT NULL,
  question_type VARCHAR(30) DEFAULT 'multiple-choice',
  options JSON NULL,
  correct_index INT UNSIGNED DEFAULT 0,
  sort_order INT UNSIGNED DEFAULT 0,
  CONSTRAINT fk_questions_quiz FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
);

-- ─── Progress & Results ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lesson_progress (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  lesson_id BIGINT UNSIGNED NOT NULL,
  status ENUM('not_started','in_progress','completed') DEFAULT 'not_started',
  completed_at TIMESTAMP NULL,
  UNIQUE KEY uq_user_lesson (user_id, lesson_id),
  CONSTRAINT fk_progress_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_progress_lesson FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS quiz_results (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  quiz_id BIGINT UNSIGNED NOT NULL,
  score INT UNSIGNED NOT NULL,
  passed TINYINT(1) DEFAULT 0,
  answers JSON NULL,
  taken_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_results_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_results_quiz FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
);

-- ─── Seed data (optional) ──────────────────────────────────────
INSERT IGNORE INTO roles (name) VALUES ('admin'), ('user');
