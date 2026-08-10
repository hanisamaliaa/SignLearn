import * as progressRepo from "../repositories/progressRepository.js";
import * as lessonRepo from "../repositories/lessonRepository.js";
import * as courseRepo from "../repositories/courseRepository.js";
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
