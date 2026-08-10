import { query } from "../config/database.js";

/**
 * Repository progres belajar.
 *
 * Versi sebelumnya meng-import `supabase` dari `config/database.js` dan
 * memanggil `.from().upsert()`. Modul itu kini mengekspor connection pool
 * `pg`, sehingga seluruh fungsi di sini akan melempar TypeError saat dipanggil.
 */

// ─── Tulis ───────────────────────────────────────────────────────────────

/**
 * Menyimpan progres satu pelajaran — IDEMPOTEN.
 *
 * `ON CONFLICT` memakai constraint `uq_user_lesson (user_id, lesson_id)`.
 *
 * Dua sifat yang dijaga di level SQL, bukan di aplikasi:
 *
 *   1. `completed_at` hanya diisi pada penyelesaian PERTAMA. Menekan tombol
 *      "selesai" dua kali tidak menggeser tanggalnya — data itu dipakai
 *      laporan admin dan streak belajar.
 *   2. Status tidak pernah MUNDUR dari `completed` ke `in_progress`. Membuka
 *      ulang pelajaran yang sudah selesai adalah hal wajar; ia tidak boleh
 *      menghapus capaian.
 */
export async function upsert(userId, lessonId, status) {
  const { rows } = await query(
    // `$3` di-cast eksplisit ke varchar. Tanpa cast, Postgres menyimpulkan
    // dua tipe berbeda untuk parameter yang sama — varchar dari kolom
    // `status`, dan text dari perbandingan di dalam CASE — lalu menolak
    // query dengan "inconsistent types deduced for parameter $3".
    `INSERT INTO lesson_progress (user_id, lesson_id, status, completed_at, updated_at)
     VALUES ($1, $2, $3::varchar,
             CASE WHEN $3::varchar = 'completed' THEN NOW() ELSE NULL END, NOW())
     ON CONFLICT (user_id, lesson_id) DO UPDATE
        SET status = CASE
              WHEN lesson_progress.status = 'completed' THEN 'completed'
              ELSE EXCLUDED.status
            END,
            completed_at = COALESCE(lesson_progress.completed_at, EXCLUDED.completed_at),
            updated_at = NOW()
     RETURNING lesson_id, status, completed_at, updated_at`,
    [userId, lessonId, status],
  );

  const r = rows[0];
  return {
    lessonId: String(r.lesson_id),
    status: r.status,
    completedAt: r.completed_at?.toISOString() ?? null,
    updatedAt: r.updated_at.toISOString(),
  };
}

// ─── Baca ────────────────────────────────────────────────────────────────

/** Ringkasan lintas kursus untuk halaman progres & dashboard. */
export async function summary(userId) {
  const { rows } = await query(
    `SELECT
       (SELECT COUNT(*)::int FROM lessons)                                    AS total_lessons,
       (SELECT COUNT(*)::int FROM lesson_progress
         WHERE user_id = $1 AND status = 'completed')                         AS lessons_completed,
       (SELECT COUNT(DISTINCT l.course_id)::int
          FROM lesson_progress lp JOIN lessons l ON l.id = lp.lesson_id
         WHERE lp.user_id = $1)                                               AS courses_started,
       (SELECT COUNT(*)::int FROM quiz_results
         WHERE user_id = $1 AND passed)                                       AS quizzes_passed,
       (SELECT MAX(updated_at) FROM lesson_progress WHERE user_id = $1)       AS last_activity`,
    [userId],
  );

  const r = rows[0];
  return {
    coursesStarted: Number(r.courses_started),
    lessonsCompleted: Number(r.lessons_completed),
    totalLessons: Number(r.total_lessons),
    quizzesPassed: Number(r.quizzes_passed),
    lastActivityAt: r.last_activity?.toISOString() ?? null,
  };
}

/** Rincian per kursus — hanya kursus yang sudah disentuh pengguna. */
export async function byCourse(userId) {
  const { rows } = await query(
    `SELECT c.id, c.title, c.total_lessons,
            COUNT(*) FILTER (WHERE lp.status = 'completed')::int AS completed,
            MAX(lp.updated_at) AS last_seen
       FROM courses c
       JOIN lessons l ON l.course_id = c.id
       JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.user_id = $1
      GROUP BY c.id, c.title, c.total_lessons
      ORDER BY MAX(lp.updated_at) DESC`,
    [userId],
  );

  return rows.map((r) => {
    const total = Number(r.total_lessons);
    const completed = Number(r.completed);
    return {
      courseId: String(r.id),
      title: r.title,
      completedLessons: completed,
      totalLessons: total,
      percent: total ? Math.round((completed / total) * 100) : 0,
      isCompleted: total > 0 && completed >= total,
      lastAccessedAt: r.last_seen?.toISOString() ?? null,
    };
  });
}

/** Jumlah hari berturut-turut pengguna belajar, dihitung sampai hari ini. */
export async function streakDays(userId) {
  const { rows } = await query(
    `SELECT DISTINCT DATE(updated_at) AS day
       FROM lesson_progress WHERE user_id = $1
      ORDER BY day DESC LIMIT 400`,
    [userId],
  );
  if (rows.length === 0) return 0;

  const days = rows.map((r) => new Date(r.day).toISOString().slice(0, 10));
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

  // Streak masih hidup bila aktivitas terakhir hari ini ATAU kemarin —
  // kalau hanya menerima hari ini, streak putus setiap tengah malam
  // bagi pengguna yang belajar malam hari.
  if (days[0] !== today && days[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < days.length; i++) {
    const expected = new Date(new Date(days[i - 1]).getTime() - 86_400_000)
      .toISOString().slice(0, 10);
    if (days[i] !== expected) break;
    streak++;
  }
  return streak;
}

/**
 * Pelajaran satu kursus beserta status DAN kelayakan akses.
 *
 * Aturan buka-kunci (tracker fitur #12) dihitung di sini karena butuh tiga
 * sumber sekaligus: urutan pelajaran, progres pengguna, dan hasil kuis.
 * `LAG()` memberi pelajaran sebelumnya tanpa query terpisah per baris.
 */
export async function lessonsWithAccess(courseId, userId) {
  const { rows } = await query(
    `WITH ordered AS (
       SELECT l.id, l.title, l.sort_order, l.is_locked,
              LAG(l.id) OVER (PARTITION BY l.course_id ORDER BY l.sort_order, l.id) AS prev_id
         FROM lessons l
        WHERE l.course_id = $1
     )
     SELECT o.id, o.title, o.sort_order, o.is_locked, o.prev_id,
            COALESCE(p.status, 'not_started') AS status,
            COALESCE(pp.status, 'not_started') AS prev_status,
            EXISTS (SELECT 1 FROM quizzes q WHERE q.lesson_id = o.prev_id) AS prev_has_quiz,
            EXISTS (
              SELECT 1 FROM quizzes q
               JOIN quiz_results qr ON qr.quiz_id = q.id AND qr.user_id = $2 AND qr.passed
               WHERE q.lesson_id = o.prev_id
            ) AS prev_quiz_passed
       FROM ordered o
       LEFT JOIN lesson_progress p  ON p.lesson_id  = o.id      AND p.user_id  = $2
       LEFT JOIN lesson_progress pp ON pp.lesson_id = o.prev_id AND pp.user_id = $2
      ORDER BY o.sort_order ASC, o.id ASC`,
    [courseId, userId],
  );

  return rows.map((r) => ({
    id: String(r.id),
    title: r.title,
    sortOrder: Number(r.sort_order),
    isLocked: r.is_locked,
    status: r.status,
    prevId: r.prev_id ? String(r.prev_id) : null,
    prevStatus: r.prev_status,
    prevHasQuiz: r.prev_has_quiz,
    prevQuizPassed: r.prev_quiz_passed,
  }));
}

/** Data mentah untuk menghitung kelayakan akses satu pelajaran. */
export async function accessInfo(lessonId, userId) {
  const { rows } = await query(
    `WITH target AS (SELECT id, course_id, sort_order, is_locked FROM lessons WHERE id = $1),
     prev AS (
       SELECT l.id FROM lessons l, target t
        WHERE l.course_id = t.course_id
          AND (l.sort_order, l.id) < (t.sort_order, t.id)
        ORDER BY l.sort_order DESC, l.id DESC LIMIT 1
     )
     SELECT t.is_locked,
            (SELECT id FROM prev) AS prev_id,
            COALESCE((SELECT status FROM lesson_progress
                       WHERE lesson_id = (SELECT id FROM prev) AND user_id = $2), 'not_started') AS prev_status,
            EXISTS (SELECT 1 FROM quizzes q WHERE q.lesson_id = (SELECT id FROM prev)) AS prev_has_quiz,
            EXISTS (
              SELECT 1 FROM quizzes q
               JOIN quiz_results qr ON qr.quiz_id = q.id AND qr.user_id = $2 AND qr.passed
               WHERE q.lesson_id = (SELECT id FROM prev)
            ) AS prev_quiz_passed
       FROM target t`,
    [lessonId, userId],
  );

  if (!rows[0]) return null;
  const r = rows[0];
  return {
    isLocked: r.is_locked,
    prevId: r.prev_id ? String(r.prev_id) : null,
    prevStatus: r.prev_status,
    prevHasQuiz: r.prev_has_quiz,
    prevQuizPassed: r.prev_quiz_passed,
  };
}

/** Bahan penghitungan badge — semuanya diturunkan, tidak ada tabel badge. */
export async function badgeStats(userId) {
  const { rows } = await query(
    `SELECT
       (SELECT COUNT(*)::int FROM lesson_progress
         WHERE user_id = $1 AND status = 'completed')            AS lessons_completed,
       (SELECT COUNT(*)::int FROM quiz_results
         WHERE user_id = $1 AND passed)                          AS quizzes_passed,
       (SELECT COUNT(*)::int FROM quiz_results
         WHERE user_id = $1 AND score = 100)                     AS perfect_scores,
       (SELECT COUNT(*)::int FROM (
          SELECT c.id FROM courses c
            JOIN lessons l ON l.course_id = c.id
            JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.user_id = $1
           WHERE c.total_lessons > 0
           GROUP BY c.id, c.total_lessons
          HAVING COUNT(*) FILTER (WHERE lp.status = 'completed') >= c.total_lessons
        ) done)                                                  AS courses_completed`,
    [userId],
  );

  const r = rows[0];
  return {
    lessonsCompleted: Number(r.lessons_completed),
    quizzesPassed: Number(r.quizzes_passed),
    perfectScores: Number(r.perfect_scores),
    coursesCompleted: Number(r.courses_completed),
  };
}
