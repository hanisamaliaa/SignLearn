import { asyncHandler } from "../utils/asyncHandler.js";
import { success, created } from "../utils/apiResponse.js";
import * as lessonService from "../services/lessonService.js";

/**
 * Lesson controller — HTTP saja.
 *
 * Tanpa try/catch manual: `asyncHandler` meneruskan promise yang ditolak ke
 * error middleware, yang lalu memetakannya ke envelope error seragam
 * (API Contract §2.3). Membangun objek error di controller berarti bentuk
 * respons diduplikasi di setiap handler dan pasti menyimpang.
 */

/** courseId dapat berasal dari path bersarang atau body pada rute datar. */
const courseIdFrom = (req) => req.params.courseId ?? req.body.courseId;

// ─── GET /courses/:courseId/lessons ──────────────────────────────────────
export const listByCourse = asyncHandler(async (req, res) => {
  const result = await lessonService.listByCourse(
    req.params.courseId,
    { page: req.query.page, limit: req.query.limit },
    req.user,
  );
  success(res, result, "Daftar pelajaran berhasil diambil.");
});

// ─── GET /courses/:courseId/lessons/:lessonId ────────────────────────────
export const getByCourseAndId = asyncHandler(async (req, res) => {
  const result = await lessonService.getByCourseAndId(
    req.params.courseId,
    req.params.lessonId,
    req.user,
  );
  success(res, result, "Pelajaran berhasil diambil.");
});

// ─── GET /lessons/:id ────────────────────────────────────────────────────
export const getById = asyncHandler(async (req, res) => {
  const result = await lessonService.getById(req.params.id, req.user);
  success(res, result, "Pelajaran berhasil diambil.");
});

// ─── POST ────────────────────────────────────────────────────────────────
export const create = asyncHandler(async (req, res) => {
  // Field diambil satu per satu, bukan menyebar `req.body`. Menyebar body
  // membuka mass assignment: klien dapat menyisipkan kolom yang tidak
  // dimaksudkan, dan penambahan kolom baru di masa depan langsung terekspos.
  const lesson = await lessonService.create(courseIdFrom(req), {
    title: req.body.title,
    description: req.body.description,
    duration: req.body.duration,
    videoUrl: req.body.videoUrl,
    sortOrder: req.body.sortOrder,
    isLocked: req.body.isLocked,
  });
  created(res, { lesson }, "Pelajaran berhasil dibuat.");
});

// ─── PUT ─────────────────────────────────────────────────────────────────
export const update = asyncHandler(async (req, res) => {
  const patch = {};
  for (const key of ["title", "description", "duration", "videoUrl", "sortOrder", "isLocked", "courseId"]) {
    if (req.body[key] !== undefined) patch[key] = req.body[key];
  }

  const lessonId = req.params.lessonId ?? req.params.id;
  const lesson = await lessonService.update(lessonId, patch);
  success(res, { lesson }, "Pelajaran berhasil diperbarui.");
});

// ─── DELETE ──────────────────────────────────────────────────────────────
export const remove = asyncHandler(async (req, res) => {
  await lessonService.remove(req.params.lessonId ?? req.params.id);
  success(res, null, "Pelajaran berhasil dihapus.");
});

// ─── PATCH /courses/:courseId/lessons/reorder ────────────────────────────
export const reorder = asyncHandler(async (req, res) => {
  const items = await lessonService.reorder(req.params.courseId, req.body.order);
  success(res, { items }, "Urutan pelajaran berhasil diperbarui.");
});
