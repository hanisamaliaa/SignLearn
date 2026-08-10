import * as lessonRepo from "../repositories/lessonRepository.js";
import * as courseRepo from "../repositories/courseRepository.js";
import * as progressService from "./progressService.js";
import { ApiError } from "../utils/ApiError.js";
import { paginate, meta } from "../utils/pagination.js";

/**
 * Lesson service — seluruh aturan bisnis pelajaran.
 *
 * Controller tidak memuat logika; ia hanya menerjemahkan HTTP ke pemanggilan
 * service. Aturan di sini karenanya dapat diuji tanpa Express.
 */

/** Memastikan kursus ada — dipakai sebelum operasi apa pun yang merujuknya. */
async function requireCourse(courseId) {
  const course = await courseRepo.findById(courseId);
  if (!course) throw ApiError.notFound("Kursus tidak ditemukan.");
  return course;
}

async function requireLesson(id) {
  const lesson = await lessonRepo.findById(id);
  if (!lesson) throw ApiError.notFound("Pelajaran tidak ditemukan.");
  return lesson;
}

// ─── Baca ────────────────────────────────────────────────────────────────

export async function listByCourse(courseId, options = {}, viewer = null) {
  await requireCourse(courseId);

  const { page, limit, offset } = paginate(options);
  const total = await lessonRepo.countByCourse(courseId);

  // Pengguna terautentikasi mendapat status penyelesaian; tamu tidak.
  const items = viewer?.id && viewer.role === "user"
    ? await lessonRepo.findByCourseWithProgress(courseId, viewer.id, { limit, offset })
    : await lessonRepo.findByCourse(courseId, { limit, offset });

  return { items, pagination: meta(page, limit, total) };
}

/**
 * Detail pelajaran beserta tetangganya.
 *
 * Kelayakan akses didelegasikan ke progressService, yang menerapkan aturan
 * buka-kunci sesungguhnya (tracker fitur #12).
 *
 * Versi sebelumnya di sini hanya memeriksa `isLocked && role === 'user'` —
 * kunci yang TIDAK PERNAH TERBUKA. Pelajaran yang ditandai terkunci menjadi
 * tidak dapat diakses selamanya, berapa pun kuis yang sudah dilulusi, dan
 * seluruh alur pembelajaran berhenti di pelajaran terkunci pertama.
 */
export async function getById(id, viewer = null) {
  const lesson = await requireLesson(id);

  await progressService.assertLessonAccessible(id, viewer);

  const { prev, next } = await lessonRepo.findNeighbours(
    lesson.courseId, lesson.sortOrder, lesson.id,
  );

  return { lesson, prev, next };
}

/** Verifikasi bahwa pelajaran benar-benar milik kursus pada path bersarang. */
export async function getByCourseAndId(courseId, lessonId, viewer = null) {
  const result = await getById(lessonId, viewer);

  if (result.lesson.courseId !== String(courseId)) {
    // 404, bukan 403 — dari sudut pandang kursus ini, pelajaran itu memang
    // tidak ada. Membalas 403 justru membocorkan bahwa id-nya valid di tempat lain.
    throw ApiError.notFound("Pelajaran tidak ditemukan pada kursus ini.");
  }
  return result;
}

// ─── Tulis ───────────────────────────────────────────────────────────────

export async function create(courseId, data) {
  await requireCourse(courseId);
  return lessonRepo.create({ ...data, courseId });
}

export async function update(id, data) {
  await requireLesson(id);

  // Memindahkan pelajaran ke kursus lain hanya sah bila kursus tujuan ada.
  if (data.courseId !== undefined) await requireCourse(data.courseId);

  return lessonRepo.update(id, data);
}

/**
 * Menghapus pelajaran.
 *
 * Ditolak bila sudah ada pengguna yang menyelesaikannya: `lesson_progress`
 * memakai `ON DELETE CASCADE`, sehingga menghapus pelajaran akan menghapus
 * riwayat belajar orang secara permanen. Kunci pelajarannya, jangan hapus.
 */
export async function remove(id) {
  await requireLesson(id);

  if (await lessonRepo.hasCompletions(id)) {
    throw ApiError.conflict(
      "Pelajaran ini sudah diselesaikan sebagian pengguna. " +
      "Kunci pelajaran (isLocked) alih-alih menghapusnya agar riwayat belajar mereka tidak hilang.",
    );
  }

  const deleted = await lessonRepo.remove(id);
  if (!deleted) throw ApiError.notFound("Pelajaran tidak ditemukan.");
}

export async function reorder(courseId, orderedIds) {
  await requireCourse(courseId);

  try {
    return await lessonRepo.reorder(courseId, orderedIds);
  } catch (err) {
    if (err.code === "INCOMPLETE_ORDER") {
      throw ApiError.validation(
        "Daftar urutan harus memuat seluruh pelajaran pada kursus ini.",
        [{ field: "order", message: "Jumlah atau isi id tidak cocok dengan pelajaran kursus ini." }],
      );
    }
    throw err;
  }
}
