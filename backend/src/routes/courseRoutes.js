import { Router } from "express";
import * as courseController from "../controllers/courseController.js";
import * as lessonController from "../controllers/lessonController.js";
import * as quizController from "../controllers/quizController.js";
import { authenticate, optionalAuthenticate } from "../middleware/auth.middleware.js";
import { requireAdmin, requireUser } from "../middleware/rbac.middleware.js";
import { requirePremium, requirePremiumOrAdmin } from "../middleware/premium.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { uploadSingleImage } from "../middleware/imageUpload.middleware.js";
import { imageUploadLimiter } from "../middleware/rateLimit.middleware.js";
import {
  validateCreateLesson,
  validateUpdateLesson,
  validateReorderLessons,
} from "../validators/lessonValidator.js";
import {
  validateCreateCourse,
  validateUpdateCourse,
  validateCourseQuery,
} from "../validators/courseValidator.js";
import {
  validateCreateQuiz,
  validateUpdateQuiz,
  validateCreateQuestion,
  validateUpdateQuestion,
  validateReorderQuestions,
  validateSubmitQuiz,
} from "../validators/quizValidator.js";

const router = Router();

// ─── Kursus ──────────────────────────────────────────────────────────────
//
// `/categories` didaftarkan SEBELUM `/:id`. Express mencocokkan berurutan,
// jadi bila terbalik, permintaan ke `/categories` tertangkap sebagai
// id = "categories" lalu berakhir 404 yang menyesatkan.
router.get("/categories", courseController.getCategories);

router.get(
  "/",
  optionalAuthenticate,
  validate(validateCourseQuery),
  courseController.getAllCourses,
);
router.get("/:id", optionalAuthenticate, courseController.getCourseById);

router.post(
  "/",
  authenticate,
  requireAdmin,
  validate(validateCreateCourse),
  courseController.createCourse,
);
router.put(
  "/:id",
  authenticate,
  requireAdmin,
  validate(validateUpdateCourse),
  courseController.updateCourse,
);
router.post(
  "/:id/thumbnail",
  authenticate,
  requireAdmin,
  imageUploadLimiter,
  uploadSingleImage,
  courseController.uploadThumbnail,
);
router.delete("/:id", authenticate, requireAdmin, courseController.deleteCourse);

// ─── Pelajaran bersarang (bentuk kanonik, API Contract §8.6-8.9) ─────────
//
// PENTING: `/reorder` didaftarkan SEBELUM `/:lessonId`.
// Express mencocokkan rute berurutan, jadi bila `/:lessonId` lebih dulu,
// permintaan ke `/reorder` akan tertangkap sebagai lessonId = "reorder"
// dan berakhir 404 yang membingungkan.
router.patch(
  "/:courseId/lessons/reorder",
  authenticate,
  requireAdmin,
  validate(validateReorderLessons),
  lessonController.reorder,
);

router.get("/:courseId/lessons", optionalAuthenticate, lessonController.listByCourse);
router.get("/:courseId/lessons/:lessonId", optionalAuthenticate, lessonController.getByCourseAndId);

router.post(
  "/:courseId/lessons",
  authenticate,
  requireAdmin,
  validate(validateCreateLesson),
  lessonController.create,
);

router.put(
  "/:courseId/lessons/:lessonId",
  authenticate,
  requireAdmin,
  validate(validateUpdateLesson),
  lessonController.update,
);

router.delete(
  "/:courseId/lessons/:lessonId",
  authenticate,
  requireAdmin,
  lessonController.remove,
);

// ─── Kuis bersarang (API Contract §8.10-8.13) ────────────────────────────
//
// Rute yang lebih spesifik didaftarkan lebih dulu: `/questions/reorder`
// sebelum `/questions/:questionId`, dan seluruh sub-path `/questions`
// sebelum `/:quizId` yang lebih longgar.
router.patch(
  "/:courseId/quizzes/:quizId/questions/reorder",
  authenticate,
  requireAdmin,
  validate(validateReorderQuestions),
  quizController.reorderQuestions,
);

router.get(
  "/:courseId/quizzes/:quizId/questions",
  authenticate,
  requireAdmin,
  quizController.getQuestions,
);
router.post(
  "/:courseId/quizzes/:quizId/questions",
  authenticate,
  requireAdmin,
  validate(validateCreateQuestion),
  quizController.createQuestion,
);
router.put(
  "/:courseId/quizzes/:quizId/questions/:questionId",
  authenticate,
  requireAdmin,
  validate(validateUpdateQuestion),
  quizController.updateQuestion,
);
router.delete(
  "/:courseId/quizzes/:quizId/questions/:questionId",
  authenticate,
  requireAdmin,
  quizController.deleteQuestion,
);

// Pengerjaan kuis — HANYA peran `user`.
//
// Admin ditolak dengan sengaja: mereka tidak punya baris progres belajar,
// sehingga hasil pengerjaan mereka menjadi baris `quiz_results` yatim yang
// mencemari seluruh laporan admin (API Contract §4).
router.post(
  "/:courseId/quizzes/:quizId/submit",
  authenticate,
  requireUser,
  requirePremium,
  validate(validateSubmitQuiz),
  quizController.submitQuiz,
);

router.post(
  "/:courseId/quizzes/:quizId/start",
  authenticate,requireUser,requirePremium,quizController.startQuiz,
);

router.get("/:courseId/quizzes", optionalAuthenticate, quizController.getQuizzesByCourse);
router.get("/:courseId/quizzes/:quizId", authenticate, requirePremiumOrAdmin, quizController.getQuizById);

router.post(
  "/:courseId/quizzes",
  authenticate,
  requireAdmin,
  validate(validateCreateQuiz),
  quizController.createQuiz,
);
router.put(
  "/:courseId/quizzes/:quizId",
  authenticate,
  requireAdmin,
  validate(validateUpdateQuiz),
  quizController.updateQuiz,
);
router.delete(
  "/:courseId/quizzes/:quizId",
  authenticate,
  requireAdmin,
  quizController.deleteQuiz,
);

export default router;
