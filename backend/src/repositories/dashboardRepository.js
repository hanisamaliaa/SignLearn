import { query } from "../config/database.js";

/**
 * Repository dashboard — agregasi untuk pembelajar dan admin.
 *
 * Seluruh angka dihitung di PostgreSQL, bukan dengan menarik baris ke Node
 * lalu menjumlahkannya di sana. Bedanya bukan gaya: menghitung 200 pelajaran
 * selesai di aplikasi berarti mengirim 200 baris lewat jaringan untuk
 * menghasilkan satu angka.
 */

// ─── Dashboard pembelajar (§10.3) ────────────────────────────────────────

/**
 * Pelajaran yang harus dikerjakan berikutnya.
 *
 * Aturannya: pelajaran BELUM SELESAI pertama, dengan prioritas pada kursus
 * yang paling baru disentuh. Tanpa prioritas itu, pengguna yang sedang berada
 * di kursus ketiga akan terus dilempar kembali ke kursus pertama yang belum
 * tuntas — kartu "lanjutkan belajar" justru menghambat.
 *
 * Mengembalikan `null` untuk pengguna yang belum punya progres sama sekali.
 * Kontrak §10.3 menuntutnya: frontend menampilkan CTA ke `/courses`, bukan
 * kartu berisi pelajaran acak yang tidak pernah dibuka orang itu.
 */
export async function continueLearning(userId) {
  const { rows } = await query(
    `WITH recent AS (
       SELECT l.course_id
         FROM lesson_progress lp
         JOIN lessons l ON l.id = lp.lesson_id
        WHERE lp.user_id = $1
        ORDER BY lp.updated_at DESC
        LIMIT 1
     )
     SELECT c.id   AS course_id,
            c.title AS course_title,
            l.id   AS lesson_id,
            l.title AS lesson_title
       FROM lessons l
       JOIN courses c ON c.id = l.course_id
       LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.user_id = $1
      WHERE EXISTS (SELECT 1 FROM recent)
        AND COALESCE(lp.status, 'not_started') <> 'completed'
      ORDER BY (l.course_id = (SELECT course_id FROM recent)) DESC,
               c.sort_order ASC, c.id ASC, l.sort_order ASC, l.id ASC
      LIMIT 1`,
    [userId],
  );

  if (!rows[0]) return null;
  const r = rows[0];
  return {
    courseId: String(r.course_id),
    courseTitle: r.course_title,
    lessonId: String(r.lesson_id),
    lessonTitle: r.lesson_title,
  };
}

/**
 * Kuis terakhir yang dikerjakan.
 *
 * `answers` sengaja TIDAK diambil. Kolom itu memuat jawaban beserta penanda
 * benar/salah per soal; mengirimkannya ke dashboard berarti kunci jawaban
 * ikut terbawa ke setiap pemuatan halaman depan.
 */
export async function recentQuizzes(userId, limit = 5) {
  const { rows } = await query(
    `SELECT qr.id, qr.quiz_id, q.title, qr.score, qr.passed, qr.taken_at
       FROM quiz_results qr
       JOIN quizzes q ON q.id = qr.quiz_id
      WHERE qr.user_id = $1
      ORDER BY qr.taken_at DESC, qr.id DESC
      LIMIT $2`,
    [userId, limit],
  );

  return rows.map((r) => ({
    quizId: String(r.quiz_id),
    quizTitle: r.title,
    score: Number(r.score),
    passed: r.passed,
    takenAt: r.taken_at.toISOString(),
  }));
}

// ─── Dashboard admin (§10.4) ─────────────────────────────────────────────

/**
 * Ringkasan platform.
 *
 * `activeUsers` dihitung dari kolom `users.status`, BUKAN dari aktivitas
 * belajar terakhir. Keduanya sah tetapi berbeda arti: yang ini menjawab
 * "berapa akun yang tidak ditangguhkan atau dinonaktifkan", bukan "berapa
 * orang yang benar-benar belajar bulan ini". Bila yang kedua yang diinginkan,
 * ganti sub-query ini — bukan menambah field baru dengan nama mirip.
 */
export async function adminTotals() {
  const { rows } = await query(
    `SELECT
       (SELECT COUNT(*)::int FROM users)                          AS users,
       (SELECT COUNT(*)::int FROM users WHERE status = 'active')  AS active_users,
       (SELECT COUNT(*)::int FROM courses)                        AS courses,
       (SELECT COUNT(*)::int FROM lessons)                        AS lessons,
       (SELECT COUNT(*)::int FROM quizzes)                        AS quizzes`,
  );

  const r = rows[0];
  return {
    users: Number(r.users),
    activeUsers: Number(r.active_users),
    courses: Number(r.courses),
    lessons: Number(r.lessons),
    quizzes: Number(r.quizzes),
  };
}

/**
 * Pertumbuhan & keterlibatan.
 *
 * `avgQuizScore` sengaja TIDAK dibatasi 7 hari, berbeda dari dua tetangganya
 * yang bersufiks `7d`. Penamaan di kontrak §10.4 sudah menyatakannya: field
 * yang dibatasi waktu membawa sufiksnya sendiri.
 */
export async function adminTrends() {
  const { rows } = await query(
    `SELECT
       (SELECT COUNT(*)::int FROM users
         WHERE created_at >= NOW() - INTERVAL '7 days')            AS new_users_7d,
       (SELECT COUNT(*)::int FROM users
         WHERE created_at >= NOW() - INTERVAL '30 days')           AS new_users_30d,
       (SELECT COUNT(*)::int FROM lesson_progress
         WHERE status = 'completed'
           AND completed_at >= NOW() - INTERVAL '7 days')          AS lessons_completed_7d,
       (SELECT COUNT(*)::int FROM quiz_results
         WHERE taken_at >= NOW() - INTERVAL '7 days')              AS quizzes_taken_7d,
       (SELECT ROUND(AVG(score))::int FROM quiz_results)           AS avg_quiz_score`,
  );

  const r = rows[0];
  return {
    growth: {
      newUsers7d: Number(r.new_users_7d),
      newUsers30d: Number(r.new_users_30d),
    },
    engagement: {
      lessonsCompleted7d: Number(r.lessons_completed_7d),
      quizzesTaken7d: Number(r.quizzes_taken_7d),
      // AVG atas tabel kosong bernilai NULL. Mengirim null memaksa setiap
      // pemakai di frontend menuliskan penjagaannya sendiri; 0 sudah benar.
      avgQuizScore: r.avg_quiz_score === null ? 0 : Number(r.avg_quiz_score),
    },
  };
}

// ─── Laporan admin (§10.5) ───────────────────────────────────────────────

/**
 * Deret waktu pendaftaran, penyelesaian pelajaran, dan pengerjaan kuis.
 *
 * `generate_series` membangun SETIAP bucket dalam rentang, termasuk yang
 * kosong. Ini bukan detail kosmetik: `GROUP BY` biasa hanya mengembalikan
 * hari yang punya data, sehingga grafik frontend menyambung 1 Agustus
 * langsung ke 5 Agustus dan memperlihatkan garis naik mulus di masa yang
 * sebenarnya sepi.
 *
 * @param {string} from     'YYYY-MM-DD' inklusif
 * @param {string} to       'YYYY-MM-DD' inklusif
 * @param {'day'|'week'|'month'} unit  sudah divalidasi allowlist di validator
 */
export async function reportSeries(from, to, unit) {
  const { rows } = await query(
    // `unit` dikirim sebagai PARAMETER, bukan diinterpolasi. Ia dipakai dua
    // kali: sebagai field date_trunc dan sebagai satuan interval.
    `WITH bounds AS (
       SELECT $1::date AS from_date, ($2::date + 1) AS to_exclusive
     ),
     buckets AS (
       SELECT generate_series(
                date_trunc($3, (SELECT from_date FROM bounds)::timestamp),
                (SELECT to_exclusive FROM bounds)::timestamp - INTERVAL '1 microsecond',
                ('1 ' || $3)::interval
              ) AS bucket_start
     )
     SELECT
       GREATEST(b.bucket_start, (SELECT from_date FROM bounds)::timestamp)::date AS date,
       (SELECT COUNT(*)::int FROM users u
         WHERE u.created_at >= b.bucket_start
           AND u.created_at <  LEAST(b.bucket_start + ('1 ' || $3)::interval,
                                     (SELECT to_exclusive FROM bounds)::timestamp)
           AND u.created_at >= (SELECT from_date FROM bounds)::timestamp) AS new_users,
       (SELECT COUNT(*)::int FROM lesson_progress lp
         WHERE lp.status = 'completed'
           AND lp.completed_at >= b.bucket_start
           AND lp.completed_at <  LEAST(b.bucket_start + ('1 ' || $3)::interval,
                                        (SELECT to_exclusive FROM bounds)::timestamp)
           AND lp.completed_at >= (SELECT from_date FROM bounds)::timestamp) AS lessons_completed,
       (SELECT COUNT(*)::int FROM quiz_results qr
         WHERE qr.taken_at >= b.bucket_start
           AND qr.taken_at <  LEAST(b.bucket_start + ('1 ' || $3)::interval,
                                    (SELECT to_exclusive FROM bounds)::timestamp)
           AND qr.taken_at >= (SELECT from_date FROM bounds)::timestamp) AS quizzes_taken
       FROM buckets b
      ORDER BY b.bucket_start ASC`,
    [from, to, unit],
  );

  return rows.map((r) => ({
    date: r.date.toISOString().slice(0, 10),
    newUsers: Number(r.new_users),
    lessonsCompleted: Number(r.lessons_completed),
    quizzesTaken: Number(r.quizzes_taken),
  }));
}

/**
 * Kursus dengan pembelajar terbanyak pada rentang laporan.
 *
 * `enrollments` dibatasi rentang — ia menjawab "berapa orang menyentuh kursus
 * ini pada periode tersebut". `completionRate` dihitung dari progres MENYELURUH
 * orang-orang itu, bukan hanya yang terjadi di dalam rentang: kursus yang
 * diselesaikan bulan lalu tetap selesai, dan melaporkannya sebagai 0% hanya
 * karena tidak ada aktivitas minggu ini akan menyesatkan.
 */
export async function topCourses(from, to, limit = 5) {
  const { rows } = await query(
    `WITH active_learners AS (
       SELECT DISTINCT l.course_id, lp.user_id
         FROM lesson_progress lp
         JOIN lessons l ON l.id = lp.lesson_id
        WHERE lp.updated_at >= $1::date
          AND lp.updated_at <  ($2::date + 1)
     ),
     per_user AS (
       SELECT l.course_id,
              lp.user_id,
              COUNT(*) FILTER (WHERE lp.status = 'completed') AS done
         FROM lesson_progress lp
         JOIN lessons l ON l.id = lp.lesson_id
        GROUP BY l.course_id, lp.user_id
     )
     SELECT c.id,
            c.title,
            COUNT(*)::int AS enrollments,
            COUNT(*) FILTER (
              WHERE c.total_lessons > 0 AND pu.done >= c.total_lessons
            )::int AS completers
       FROM active_learners al
       JOIN courses c  ON c.id = al.course_id
       JOIN per_user pu ON pu.course_id = al.course_id AND pu.user_id = al.user_id
      GROUP BY c.id, c.title, c.total_lessons
      ORDER BY enrollments DESC, c.id ASC
      LIMIT $3`,
    [from, to, limit],
  );

  return rows.map((r) => {
    const enrollments = Number(r.enrollments);
    const completers = Number(r.completers);
    return {
      courseId: String(r.id),
      title: r.title,
      enrollments,
      // Dibulatkan ke 2 desimal: kontrak memakai pecahan (0.41), bukan persen.
      completionRate: enrollments ? Math.round((completers / enrollments) * 100) / 100 : 0,
    };
  });
}
