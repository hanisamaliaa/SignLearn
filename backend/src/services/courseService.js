import * as courseRepo from "../repositories/courseRepository.js";
import * as lessonRepo from "../repositories/lessonRepository.js";
import { ApiError } from "../utils/ApiError.js";
import { paginate, meta, MAX_LIMIT } from "../utils/pagination.js";

/**
 * Course service — seluruh aturan bisnis kursus.
 *
 * Controller hanya menerjemahkan HTTP; aturan di sini dapat diuji tanpa Express.
 */

async function requireCourse(id) {
  const course = await courseRepo.findById(id);
  if (!course) throw ApiError.notFound("Kursus tidak ditemukan.");
  return course;
}

// ─── Baca ────────────────────────────────────────────────────────────────

/**
 * Daftar kursus.
 *
 * Pengguna dengan peran `user` mendapat blok `progress`; admin dan tamu tidak.
 * Admin tidak punya baris progres belajar, jadi menyertakannya hanya akan
 * menampilkan 0% pada setiap kursus dan membingungkan (API Contract §8.1).
 */
export async function list(filters = {}, options = {}, viewer = null) {
  const { page, limit, offset } = paginate(options);
  const total = await courseRepo.count(filters);

  const opts = { limit, offset, sortBy: options.sortBy, sortDir: options.sortDir };
  const items = viewer?.id && viewer.role === "user"
    ? await courseRepo.findAllWithProgress(viewer.id, filters, opts)
    : await courseRepo.findAll(filters, opts);

  return { items, pagination: meta(page, limit, total) };
}

/**
 * Detail kursus: kursus + pelajaran + kuis dalam satu respons.
 *
 * Satu request memberi seluruh isi halaman detail. Memecahnya menjadi tiga
 * endpoint memaksa frontend melakukan waterfall request dan menampilkan
 * halaman yang terisi sepotong-sepotong.
 */
export async function getById(id, viewer = null) {
  const isLearner = viewer?.id && viewer.role === "user";

  const course = isLearner
    ? await courseRepo.findByIdWithProgress(id, viewer.id)
    : await courseRepo.findById(id);

  if (!course) throw ApiError.notFound("Kursus tidak ditemukan.");

  const [lessons, quizzes] = await Promise.all([
    isLearner
      ? lessonRepo.findByCourseWithProgress(id, viewer.id, { limit: MAX_LIMIT, offset: 0 })
      : lessonRepo.findByCourse(id, { limit: MAX_LIMIT, offset: 0 }),
    courseRepo.findQuizzes(id),
  ]);

  return { course, lessons, quizzes };
}

export async function listCategories() {
  return courseRepo.listCategories();
}

// ─── Tulis ───────────────────────────────────────────────────────────────

export async function create(data) {
  return courseRepo.create(data);
}

export async function update(id, data) {
  await requireCourse(id);
  return courseRepo.update(id, data);
}

/**
 * Menghapus kursus.
 *
 * Ditolak bila ada pelajaran yang sudah diselesaikan pengguna. Skema memakai
 * ON DELETE CASCADE berlapis: menghapus kursus menghapus pelajarannya, yang
 * lalu menghapus seluruh `lesson_progress` — riwayat belajar semua pengguna
 * hilang permanen dalam satu klik (API Contract §8.5).
 *
 * Alternatifnya bukan menghapus, melainkan `isLocked: true`.
 */
export async function remove(id) {
  await requireCourse(id);

  if (await courseRepo.hasCompletions(id)) {
    throw ApiError.conflict(
      "Kursus ini sudah dipelajari sebagian pengguna. " +
      "Kunci kursus (isLocked) alih-alih menghapusnya agar riwayat belajar mereka tidak hilang.",
    );
  }

  const deleted = await courseRepo.remove(id);
  if (!deleted) throw ApiError.notFound("Kursus tidak ditemukan.");
}
