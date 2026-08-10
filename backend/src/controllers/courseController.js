import { asyncHandler } from "../utils/asyncHandler.js";
import { success, created } from "../utils/apiResponse.js";
import * as courseService from "../services/courseService.js";

/**
 * Course controller — HTTP saja.
 *
 * Tanpa try/catch manual: `asyncHandler` meneruskan promise yang ditolak ke
 * error middleware, yang memetakannya ke envelope error seragam.
 */

// ─── GET /courses ────────────────────────────────────────────────────────
export const getAllCourses = asyncHandler(async (req, res) => {
  const result = await courseService.list(
    { q: req.query.q, category: req.query.category, level: req.query.level },
    {
      page: req.query.page,
      limit: req.query.limit,
      sortBy: req.query.sortBy,
      sortDir: req.query.sortDir,
    },
    req.user,
  );
  success(res, result, "Daftar kursus berhasil diambil.");
});

// ─── GET /courses/categories ─────────────────────────────────────────────
export const getCategories = asyncHandler(async (_req, res) => {
  const items = await courseService.listCategories();
  success(res, { items }, "Daftar kategori berhasil diambil.");
});

// ─── GET /courses/:id ────────────────────────────────────────────────────
export const getCourseById = asyncHandler(async (req, res) => {
  const result = await courseService.getById(req.params.id, req.user);
  success(res, result, "Kursus berhasil diambil.");
});

// ─── POST /courses ───────────────────────────────────────────────────────
export const createCourse = asyncHandler(async (req, res) => {
  // Field diambil satu per satu, bukan menyebar `req.body`. Menyebar body
  // membuka mass assignment — termasuk `totalLessons` yang harus dihitung
  // server, dan kolom baru apa pun yang ditambahkan kelak.
  const course = await courseService.create({
    title: req.body.title,
    titleEn: req.body.titleEn,
    category: req.body.category,
    level: req.body.level,
    description: req.body.description,
    thumbnail: req.body.thumbnail,
    estimatedHours: req.body.estimatedHours,
    isLocked: req.body.isLocked,
    sortOrder: req.body.sortOrder,
  });
  created(res, { course }, "Kursus berhasil dibuat.");
});

// ─── PUT /courses/:id ────────────────────────────────────────────────────
export const updateCourse = asyncHandler(async (req, res) => {
  const patch = {};
  for (const key of [
    "title", "titleEn", "category", "level", "description",
    "thumbnail", "estimatedHours", "isLocked", "sortOrder",
  ]) {
    if (req.body[key] !== undefined) patch[key] = req.body[key];
  }

  const course = await courseService.update(req.params.id, patch);
  success(res, { course }, "Kursus berhasil diperbarui.");
});

// ─── DELETE /courses/:id ─────────────────────────────────────────────────
export const deleteCourse = asyncHandler(async (req, res) => {
  await courseService.remove(req.params.id);
  success(res, null, "Kursus berhasil dihapus.");
});
