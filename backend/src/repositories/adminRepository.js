import { query } from "../config/database.js";

/**
 * Repository admin — feed aktivitas (API Contract §10.6).
 *
 * ── Kenapa tidak ada tabel `activities` ───────────────────────────────
 *
 * Feed ini DITURUNKAN dari tabel yang sudah ada, bukan disimpan. Alasannya
 * sama dengan badge di progressService: catatan turunan tidak dapat menyimpang
 * dari kenyataan. Tabel audit terpisah harus ditulis oleh setiap jalur kode
 * yang mengubah data, dan jalur yang lupa menulisnya menghasilkan lubang
 * senyap di riwayat — persis pada peristiwa yang paling ingin dilacak.
 *
 * Batasnya jujur: yang dapat direkonstruksi hanyalah peristiwa yang
 * meninggalkan jejak di skema. Penghapusan kursus, misalnya, tidak muncul di
 * sini karena barisnya sudah tidak ada. Bila audit trail sungguhan dibutuhkan
 * nanti, tabel `activities` adalah penggantinya — bukan tambahan untuknya.
 */

/**
 * Sumber tunggal feed.
 *
 * `id` adalah komposit `type:rowId`. Ia wajib begitu karena keempat sumber
 * memakai sequence-nya masing-masing: `users.id = 3` dan `courses.id = 3`
 * sama-sama ada, dan tanpa awalan tipe, dua peristiwa berbeda akan berbagi
 * id yang sama — frontend React lalu memakainya sebagai `key` dan merender
 * baris yang salah.
 *
 * `course_created` tidak memiliki aktor: skema tidak menyimpan siapa yang
 * membuat kursus (tidak ada kolom `created_by`). Mengarangnya menjadi
 * "Administrator" akan membuat log audit berbohong, jadi nilainya `null`.
 */
const FEED = `
  SELECT 'user_registered'::text AS type,
         u.id                    AS row_id,
         u.created_at            AS created_at,
         u.id                    AS actor_id,
         u.name                  AS actor_name,
         'user'::text            AS subject_type,
         u.id                    AS subject_id,
         u.name                  AS subject_title,
         NULL::int               AS score
    FROM users u

  UNION ALL

  SELECT 'lesson_completed', lp.id, lp.completed_at,
         u.id, u.name,
         'lesson', l.id, l.title,
         NULL::int
    FROM lesson_progress lp
    JOIN lessons l ON l.id = lp.lesson_id
    JOIN users   u ON u.id = lp.user_id
   WHERE lp.status = 'completed' AND lp.completed_at IS NOT NULL

  UNION ALL

  SELECT 'quiz_passed', qr.id, qr.taken_at,
         u.id, u.name,
         'quiz', q.id, q.title,
         qr.score
    FROM quiz_results qr
    JOIN quizzes q ON q.id = qr.quiz_id
    JOIN users   u ON u.id = qr.user_id
   WHERE qr.passed

  UNION ALL

  SELECT 'course_created', c.id, c.created_at,
         NULL::bigint, NULL::varchar,
         'course', c.id, c.title,
         NULL::int
    FROM courses c
`;

export async function countActivities({ type } = {}) {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS total FROM (${FEED}) feed
      WHERE ($1::text IS NULL OR feed.type = $1)`,
    [type ?? null],
  );
  return rows[0].total;
}

export async function findActivities({ type } = {}, { limit = 20, offset = 0 } = {}) {
  const { rows } = await query(
    // Pengurutan sekunder pada `type` dan `row_id` membuat halaman stabil.
    // Dengan `created_at` saja, dua peristiwa pada milidetik yang sama dapat
    // bertukar urutan antar-permintaan, sehingga satu baris muncul di halaman
    // 1 dan 2 sementara baris lain tidak pernah muncul sama sekali.
    `SELECT * FROM (${FEED}) feed
      WHERE ($1::text IS NULL OR feed.type = $1)
      ORDER BY feed.created_at DESC, feed.type ASC, feed.row_id DESC
      LIMIT $2 OFFSET $3`,
    [type ?? null, limit, offset],
  );

  return rows.map((r) => ({
    id: `${r.type}:${r.row_id}`,
    type: r.type,
    actor: r.actor_id ? { id: String(r.actor_id), name: r.actor_name } : null,
    subject: {
      type: r.subject_type,
      id: String(r.subject_id),
      title: r.subject_title,
    },
    meta: r.score === null ? {} : { score: Number(r.score) },
    createdAt: r.created_at.toISOString(),
  }));
}

// ─── Hasil kuis lintas-pengguna ──────────────────────────────────────────
//
// ── Kenapa ini TIDAK diambil dari feed aktivitas ──────────────────────
//
// `findActivities({ type: "quiz_passed" })` hanya memuat baris `WHERE qr.passed`.
// Laporan yang dibangun darinya akan melaporkan nol kegagalan selamanya — dan
// grafik "distribusi nilai" yang tidak pernah menampilkan batang merah adalah
// kebohongan yang terlihat meyakinkan. Endpoint ini membaca `quiz_results`
// apa adanya, lulus maupun tidak.

/**
 * Membangun klausa WHERE untuk laporan hasil kuis.
 *
 * Rentang tanggal INKLUSIF di kedua ujung: `to` dibandingkan terhadap
 * `to::date + 1` dengan operator `<`. Menulis `taken_at <= $to::date` akan
 * memotong seluruh pengerjaan pada hari terakhir kecuali yang tepat pukul
 * 00:00:00 — laporan "1-31 Agustus" diam-diam berhenti di 30 Agustus.
 */
function buildResultFilters({ from, to, courseId, passed } = {}) {
  const clauses = [];
  const values = [];

  if (from) {
    values.push(from);
    clauses.push(`qr.taken_at >= $${values.length}::date`);
  }
  if (to) {
    values.push(to);
    clauses.push(`qr.taken_at < ($${values.length}::date + 1)`);
  }
  if (courseId) {
    values.push(courseId);
    clauses.push(`q.course_id = $${values.length}`);
  }
  if (passed !== undefined) {
    values.push(passed);
    clauses.push(`qr.passed = $${values.length}`);
  }

  return {
    where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    values,
    nextIndex: values.length + 1,
  };
}

const RESULT_JOINS = `
  FROM quiz_results qr
  JOIN quizzes q ON q.id = qr.quiz_id
  JOIN courses c ON c.id = q.course_id
  JOIN users   u ON u.id = qr.user_id
`;

export async function countQuizResults(filters = {}) {
  const { where, values } = buildResultFilters(filters);
  const { rows } = await query(
    `SELECT COUNT(*)::int AS total ${RESULT_JOINS} ${where}`,
    values,
  );
  return rows[0].total;
}

export async function findQuizResults(filters = {}, { limit = 20, offset = 0 } = {}) {
  const { where, values, nextIndex } = buildResultFilters(filters);
  values.push(limit, offset);

  const { rows } = await query(
    // `answers` sengaja TIDAK diambil. Kolom itu memuat penanda benar/salah
    // per soal; membawanya ke laporan berarti kunci jawaban ikut terkirim
    // setiap kali halaman admin dibuka.
    `SELECT qr.id, qr.score, qr.passed, qr.taken_at,
            u.id AS user_id, u.name AS user_name, u.email AS user_email,
            q.id AS quiz_id, q.title AS quiz_title, q.min_passing_score,
            c.id AS course_id, c.title AS course_title
       ${RESULT_JOINS} ${where}
      ORDER BY qr.taken_at DESC, qr.id DESC
      LIMIT $${nextIndex} OFFSET $${nextIndex + 1}`,
    values,
  );

  return rows.map((r) => ({
    id: String(r.id),
    score: Number(r.score),
    passed: r.passed,
    minPassingScore: Number(r.min_passing_score),
    takenAt: r.taken_at.toISOString(),
    user: { id: String(r.user_id), name: r.user_name, email: r.user_email },
    quiz: { id: String(r.quiz_id), title: r.quiz_title },
    course: { id: String(r.course_id), title: r.course_title },
  }));
}

/**
 * Ringkasan nilai pada rentang yang sama.
 *
 * Ambang 90 dan 70 di sini adalah pilihan TAMPILAN, bukan aturan kelulusan.
 * Kelulusan ditentukan `quizzes.min_passing_score` per kuis dan sudah tersimpan
 * di kolom `passed`; itulah yang dipakai `passedCount`. Menyamakan keduanya
 * akan membuat kuis ber-KKM 60 terlihat gagal padahal pesertanya lulus.
 */
export async function quizResultSummary(filters = {}) {
  const { where, values } = buildResultFilters(filters);
  const { rows } = await query(
    `SELECT COUNT(*)::int                                      AS total,
            COUNT(*) FILTER (WHERE qr.passed)::int             AS passed_count,
            COUNT(*) FILTER (WHERE qr.score >= 90)::int        AS band_high,
            COUNT(*) FILTER (WHERE qr.score >= 70
                               AND qr.score <  90)::int        AS band_mid,
            COUNT(*) FILTER (WHERE qr.score <  70)::int        AS band_low,
            ROUND(AVG(qr.score))::int                          AS avg_score
       ${RESULT_JOINS} ${where}`,
    values,
  );

  const r = rows[0];
  return {
    total: Number(r.total),
    passedCount: Number(r.passed_count),
    // AVG atas himpunan kosong bernilai NULL. Mengirim null memaksa setiap
    // pemakai di frontend menuliskan penjagaannya sendiri; 0 sudah benar.
    avgScore: r.avg_score === null ? 0 : Number(r.avg_score),
    bands: {
      high: Number(r.band_high),
      mid: Number(r.band_mid),
      low: Number(r.band_low),
    },
  };
}
