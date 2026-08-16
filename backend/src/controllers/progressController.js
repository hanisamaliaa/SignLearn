import { asyncHandler } from "../utils/asyncHandler.js";
import { success } from "../utils/apiResponse.js";
import * as progressService from "../services/progressService.js";

/**
 * Progress controller — HTTP saja.
 *
 * `req.user.id` berasal dari klaim JWT yang ditandatangani server.
 *
 * Versi sebelumnya memakai `const userId = 1;` yang di-hardcode. Akibatnya
 * setiap pengguna membaca dan menimpa progres pengguna nomor 1 — bukan
 * sekadar bug, melainkan kebocoran data antar-akun.
 */

// ─── GET /progress ───────────────────────────────────────────────────────
export const getUserProgress = asyncHandler(async (req, res) => {
  const result = await progressService.getUserProgress(req.user.id);
  success(res, result, "Progres belajar berhasil diambil.");
});

// ─── GET /progress/courses/:courseId ─────────────────────────────────────
export const getCourseAccess = asyncHandler(async (req, res) => {
  const items = await progressService.getCourseAccess(req.params.courseId, req.user.id);
  success(res, { items }, "Status pelajaran berhasil diambil.");
});

// ─── PUT /progress/lessons/:lessonId ─────────────────────────────────────
export const updateLessonProgress = asyncHandler(async (req, res) => {
  const result = await progressService.updateLessonProgress(
    req.user.id,
    req.params.lessonId,
    req.body.status,
  );
  success(res, result, "Progres berhasil disimpan.");
});

export const getQuizHistory = asyncHandler(async (req, res) => {
  const history = await progressService.quizHistory(req.user.id);
  success(res, history);
});

export const getQuizResultDetail = asyncHandler(async (req, res) => {
  const detail = await progressService.quizResultDetail(req.user.id, req.params.resultId);
  success(res, { result: detail });
});
