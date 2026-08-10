import { asyncHandler } from "../utils/asyncHandler.js";
import { success, created } from "../utils/apiResponse.js";
import * as quizService from "../services/quizService.js";

/**
 * Quiz controller — HTTP saja. Tanpa aturan bisnis, tanpa try/catch manual.
 */

// ─── Kuis ────────────────────────────────────────────────────────────────

export const getQuizzesByCourse = asyncHandler(async (req, res) => {
  const result = await quizService.listByCourse(
    req.params.courseId,
    { page: req.query.page, limit: req.query.limit },
    req.user,
  );
  success(res, result, "Daftar kuis berhasil diambil.");
});

export const getQuizById = asyncHandler(async (req, res) => {
  const result = await quizService.getById(
    req.params.courseId,
    req.params.quizId,
    req.user,
  );
  success(res, result, "Kuis berhasil diambil.");
});

export const createQuiz = asyncHandler(async (req, res) => {
  const quiz = await quizService.create(req.params.courseId, {
    title: req.body.title,
    lessonId: req.body.lessonId,
    minPassingScore: req.body.minPassingScore,
    durationSeconds: req.body.durationSeconds,
  });
  created(res, { quiz }, "Kuis berhasil dibuat.");
});

export const updateQuiz = asyncHandler(async (req, res) => {
  const patch = {};
  for (const key of ["title", "lessonId", "minPassingScore", "durationSeconds"]) {
    if (req.body[key] !== undefined) patch[key] = req.body[key];
  }

  const quiz = await quizService.update(req.params.courseId, req.params.quizId, patch);
  success(res, { quiz }, "Kuis berhasil diperbarui.");
});

export const deleteQuiz = asyncHandler(async (req, res) => {
  await quizService.remove(req.params.courseId, req.params.quizId);
  success(res, null, "Kuis berhasil dihapus.");
});

// ─── Pertanyaan (admin) ──────────────────────────────────────────────────

export const getQuestions = asyncHandler(async (req, res) => {
  const items = await quizService.listQuestions(req.params.courseId, req.params.quizId);
  success(res, { items }, "Daftar pertanyaan berhasil diambil.");
});

export const createQuestion = asyncHandler(async (req, res) => {
  const question = await quizService.createQuestion(req.params.courseId, req.params.quizId, {
    question: req.body.question,
    questionType: req.body.questionType,
    options: req.body.options,
    correctIndex: req.body.correctIndex,
    sortOrder: req.body.sortOrder,
  });
  created(res, { question }, "Pertanyaan berhasil dibuat.");
});

export const updateQuestion = asyncHandler(async (req, res) => {
  const patch = {};
  for (const key of ["question", "questionType", "options", "correctIndex", "sortOrder"]) {
    if (req.body[key] !== undefined) patch[key] = req.body[key];
  }

  const question = await quizService.updateQuestion(
    req.params.courseId, req.params.quizId, req.params.questionId, patch,
  );
  success(res, { question }, "Pertanyaan berhasil diperbarui.");
});

export const deleteQuestion = asyncHandler(async (req, res) => {
  await quizService.removeQuestion(
    req.params.courseId, req.params.quizId, req.params.questionId,
  );
  success(res, null, "Pertanyaan berhasil dihapus.");
});

export const reorderQuestions = asyncHandler(async (req, res) => {
  const items = await quizService.reorderQuestions(
    req.params.courseId, req.params.quizId, req.body.order,
  );
  success(res, { items }, "Urutan pertanyaan berhasil diperbarui.");
});

// ─── Pengerjaan ──────────────────────────────────────────────────────────

export const submitQuiz = asyncHandler(async (req, res) => {
  const result = await quizService.submit(
    req.params.courseId,
    req.params.quizId,
    req.user.id,
    { answers: req.body.answers, durationSeconds: req.body.durationSeconds },
  );
  created(res, { result }, result.passed ? "Selamat, Anda lulus!" : "Belum lulus. Coba lagi.");
});
