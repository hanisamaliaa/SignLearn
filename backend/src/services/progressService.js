import * as progressRepo from "../repositories/progressRepository.js";
import * as lessonRepo from "../repositories/lessonRepository.js";
import * as courseRepo from "../repositories/courseRepository.js";
import * as quizRepo from "../repositories/quizRepository.js";
import { ApiError } from "../utils/ApiError.js";
import { ERROR_CODES } from "../constants/errorCodes.js";

/**
 * Progress service — pelacakan belajar, buka-kunci pelajaran, dan badge.
 */

/**
 * Aturan buka-kunci pelajaran (tracker fitur #12).
 *
 * Sebuah pelajaran dapat diakses bila SALAH SATU terpenuhi:
 *
 *   1. `isLocked = false`            — admin tidak menguncinya
 *   2. tidak ada pelajaran sebelumnya — ini pelajaran pertama kursus
 *   3. pelajaran sebelumnya `completed`, DAN bila pelajaran itu punya kuis,
 *      kuisnya sudah LULUS
 *
 * Syarat ketiga yang menjadikan KKM bermakna: tanpa itu, kuis hanya hiasan
 * yang bisa dilewati. Dengan itu, "lulus KKM 70" benar-benar membuka jalan.
 *
 * Fungsi ini PURE — dapat diuji tanpa database.
 */
export function computeAccess(info) {
  if (!info.isLocked) return { accessible: true, reason: null };
  if (!info.prevId) return { accessible: true, reason: null };

  if (info.prevStatus !== "completed") {
    return { accessible: false, reason: "PREVIOUS_LESSON_INCOMPLETE" };
  }
  if (info.prevHasQuiz && !info.prevQuizPassed) {
    return { accessible: false, reason: "PREVIOUS_QUIZ_NOT_PASSED" };
  }
  return { accessible: true, reason: null };
}

const LOCK_MESSAGES = {
  PREVIOUS_LESSON_INCOMPLETE: "Selesaikan pelajaran sebelumnya terlebih dahulu.",
  PREVIOUS_QUIZ_NOT_PASSED: "Lulus kuis pada pelajaran sebelumnya terlebih dahulu.",
};

/**
 * Badge diturunkan dari progres, bukan disimpan di tabel.
 *
 * Tanpa tabel berarti tidak ada yang bisa menyimpang: badge selalu
 * mencerminkan keadaan sebenarnya, dan mengubah kriterianya tidak menuntut
 * migrasi maupun perhitungan ulang massal.
 */
const BADGES = [
  { code: "FIRST_LESSON", title: "Langkah Pertama", description: "Menyelesaikan pelajaran pertama.", earned: (s) => s.lessonsCompleted >= 1 },
  { code: "TEN_LESSONS", title: "Rajin Belajar", description: "Menyelesaikan 10 pelajaran.", earned: (s) => s.lessonsCompleted >= 10 },
  { code: "FIRST_QUIZ", title: "Lulus Pertama", description: "Lulus satu kuis.", earned: (s) => s.quizzesPassed >= 1 },
  { code: "PERFECT_SCORE", title: "Nilai Sempurna", description: "Meraih skor 100 pada sebuah kuis.", earned: (s) => s.perfectScores >= 1 },
  { code: "COURSE_COMPLETE", title: "Tuntas Satu Kursus", description: "Menyelesaikan seluruh pelajaran dalam satu kursus.", earned: (s) => s.coursesCompleted >= 1 },
];

function buildBadges(stats) {
  return BADGES.map(({ code, title, description, earned }) => ({
    code, title, description, earned: earned(stats),
  }));
}

// ─── Baca ────────────────────────────────────────────────────────────────

export async function getUserProgress(userId) {
  const [summary, courses, streak, badgeStats] = await Promise.all([
    progressRepo.summary(userId),
    progressRepo.byCourse(userId),
    progressRepo.streakDays(userId),
    progressRepo.badgeStats(userId),
  ]);

  const coursesCompleted = courses.filter((c) => c.isCompleted).length;

  return {
    summary: {
      ...summary,
      coursesCompleted,
      overallPercent: summary.totalLessons
        ? Math.round((summary.lessonsCompleted / summary.totalLessons) * 100)
        : 0,
      streakDays: streak,
    },
    courses,
    badges: buildBadges(badgeStats),
  };
}

/** Status + kelayakan akses seluruh pelajaran satu kursus. */
export async function getCourseAccess(courseId, userId) {
  const course = await courseRepo.findById(courseId);
  if (!course) throw ApiError.notFound("Kursus tidak ditemukan.");

  const rows = await progressRepo.lessonsWithAccess(courseId, userId);

  return rows.map((row) => {
    const { accessible, reason } = computeAccess(row);
    return {
      id: row.id,
      title: row.title,
      sortOrder: row.sortOrder,
      status: row.status,
      isLocked: row.isLocked,
      isAccessible: accessible,
      lockReason: reason,
      lockMessage: reason ? LOCK_MESSAGES[reason] : null,
    };
  });
}

/**
 * Memeriksa apakah pengguna boleh membuka satu pelajaran.
 * Melempar 403 LESSON_LOCKED bila tidak.
 */
export async function assertLessonAccessible(lessonId, viewer) {
  if (!viewer?.id || viewer.role === "admin") return;

  const info = await progressRepo.accessInfo(lessonId, viewer.id);
  if (!info) throw ApiError.notFound("Pelajaran tidak ditemukan.");

  const { accessible, reason } = computeAccess(info);
  if (!accessible) {
    throw ApiError.forbidden(LOCK_MESSAGES[reason], ERROR_CODES.LESSON_LOCKED);
  }
}

// ─── Tulis ───────────────────────────────────────────────────────────────

/**
 * Menandai progres sebuah pelajaran.
 *
 * Idempoten (lihat `progressRepository.upsert`). Mengembalikan `courseProgress`
 * agar UI dapat memperbarui cincin progres tanpa request kedua — halaman
 * pelajaran selalu membutuhkan keduanya sekaligus.
 */
export async function updateLessonProgress(userId, lessonId, status) {
  const lesson = await lessonRepo.findById(lessonId);
  if (!lesson) throw ApiError.notFound("Pelajaran tidak ditemukan.");

  // Pelajaran terkunci tidak boleh ditandai selesai. Tanpa pemeriksaan ini,
  // seluruh mekanisme buka-kunci dapat dilewati hanya dengan memanggil
  // endpoint ini langsung untuk setiap pelajaran.
  await assertLessonAccessible(lessonId, { id: userId, role: "user" });

  const progress = await progressRepo.upsert(userId, lessonId, status);
  const courses = await progressRepo.byCourse(userId);
  const courseProgress = courses.find((c) => c.courseId === lesson.courseId) ?? {
    courseId: lesson.courseId,
    completedLessons: 0,
    totalLessons: 0,
    percent: 0,
  };

  return {
    progress,
    courseProgress: {
      courseId: courseProgress.courseId,
      completedLessons: courseProgress.completedLessons,
      totalLessons: courseProgress.totalLessons,
      percent: courseProgress.percent,
    },
  };
}

// ─── Riwayat kuis pembelajar ─────────────────────────────────────────────

/**
 * Riwayat pengerjaan, dikelompokkan per kuis.
 *
 * Mengerjakan kuis yang sama tiga kali dulu menghasilkan tiga baris terpisah
 * yang terlihat seperti tiga kuis berbeda. Di sini percobaan dikumpulkan ke
 * satu entri: nilai TERTINGGI yang mewakilinya, dengan seluruh percobaan tetap
 * tersimpan di dalamnya.
 *
 * Percobaan lama sengaja TIDAK dihapus. Ia satu-satunya bukti bahwa seorang
 * anak membaik dari 40 ke 90, dan grafik peningkatan tidak dapat digambar dari
 * data yang sudah dibuang.
 */
export async function quizHistory(userId) {
  const results = await quizRepo.findResultsForUser(userId);

  const byQuiz = new Map();
  const letterMistakes = new Map();

  for (const result of results) {
    // Agregat huruf dihitung di server dan `answers` tidak pernah ikut ke
    // daftar riwayat, supaya jawaban per soal tidak terbawa ke setiap
    // pemuatan halaman.
    for (const answer of result.answers) {
      for (const [letter, count] of Object.entries(answer?.mistakes ?? {})) {
        letterMistakes.set(letter, (letterMistakes.get(letter) ?? 0) + Number(count || 0));
      }
    }

    const entry = byQuiz.get(result.quizId) ?? {
      quizId: result.quizId,
      quizTitle: result.quizTitle,
      courseId: result.courseId,
      courseTitle: result.courseTitle,
      minPassingScore: result.minPassingScore,
      attempts: [],
    };
    entry.attempts.push({
      id: result.id,
      score: result.score,
      passed: result.passed,
      takenAt: result.takenAt,
    });
    byQuiz.set(result.quizId, entry);
  }

  const quizzes = [...byQuiz.values()].map((entry) => {
    const scores = entry.attempts.map((a) => a.score);
    const best = Math.max(...scores);
    return {
      ...entry,
      // Percobaan terbaru lebih dulu; yang paling relevan bagi pemelajar.
      attempts: [...entry.attempts].reverse(),
      attemptCount: entry.attempts.length,
      bestScore: best,
      latestScore: scores.at(-1),
      // Peningkatan sejak percobaan pertama — inti dari "apakah anak membaik".
      improvement: scores.length > 1 ? scores.at(-1) - scores[0] : 0,
      passed: entry.attempts.some((a) => a.passed),
      lastTakenAt: entry.attempts.at(-1).takenAt,
    };
  });
  quizzes.sort((a, b) => b.lastTakenAt.localeCompare(a.lastTakenAt));

  const bestScores = quizzes.map((q) => q.bestScore);

  return {
    quizzes,
    // Deret waktu seluruh percobaan, untuk grafik peningkatan.
    trend: results.map((r) => ({
      resultId: r.id,
      quizId: r.quizId,
      quizTitle: r.quizTitle,
      courseTitle: r.courseTitle,
      score: r.score,
      passed: r.passed,
      takenAt: r.takenAt,
    })),
    letterMistakes: [...letterMistakes.entries()]
      .map(([letter, count]) => ({ letter, count }))
      .sort((a, b) => b.count - a.count || a.letter.localeCompare(b.letter)),
    summary: {
      totalAttempts: results.length,
      quizzesAttempted: quizzes.length,
      quizzesPassed: quizzes.filter((q) => q.passed).length,
      // Dirata-ratakan dari nilai TERBAIK tiap kuis, bukan dari seluruh
      // percobaan: mengulang untuk belajar tidak seharusnya menurunkan
      // gambaran kemampuan seseorang.
      averageBestScore: bestScores.length
        ? Math.round(bestScores.reduce((a, b) => a + b, 0) / bestScores.length)
        : 0,
    },
  };
}

/** Detail satu percobaan: benar/salah per soal, beserta kursusnya. */
export async function quizResultDetail(userId, resultId) {
  const detail = await quizRepo.findResultDetail(resultId, userId);
  if (!detail) throw ApiError.notFound("Hasil kuis tidak ditemukan.");
  return detail;
}
