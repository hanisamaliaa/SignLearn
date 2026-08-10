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
