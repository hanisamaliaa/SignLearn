import { Router } from "express";
import * as courseController from "../controllers/courseController.js";
import * as lessonController from "../controllers/lessonController.js";
import * as quizController from "../controllers/quizController.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requireAdmin } from "../middleware/rbac.middleware.js";

const router = Router();

// Public course listing for authenticated users.
router.get("/", authenticate, courseController.getAllCourses);
router.get("/:courseId", authenticate, courseController.getCourseById);

// Admin CRUD for courses.
router.post("/", authenticate, requireAdmin, courseController.createCourse);
router.put(
  "/:courseId",
  authenticate,
  requireAdmin,
  courseController.updateCourse,
);
router.delete(
  "/:courseId",
  authenticate,
  requireAdmin,
  courseController.deleteCourse,
);

// Lessons nested under a course.
router.get(
  "/:courseId/lessons",
  authenticate,
  lessonController.getLessonsByCourse,
);
router.get(
  "/:courseId/lessons/:lessonId",
  authenticate,
  lessonController.getLessonById,
);
router.post(
  "/:courseId/lessons",
  authenticate,
  requireAdmin,
  lessonController.createLesson,
);
router.put(
  "/:courseId/lessons/:lessonId",
  authenticate,
  requireAdmin,
  lessonController.updateLesson,
);
router.delete(
  "/:courseId/lessons/:lessonId",
  authenticate,
  requireAdmin,
  lessonController.deleteLesson,
);

// Quizzes nested under a course.
router.get(
  "/:courseId/quizzes",
  authenticate,
  quizController.getQuizzesByCourse,
);
router.get(
  "/:courseId/quizzes/:quizId",
  authenticate,
  quizController.getQuizById,
);
router.post(
  "/:courseId/quizzes/:quizId/submit",
  authenticate,
  quizController.submitQuiz,
);
router.post(
  "/:courseId/quizzes",
  authenticate,
  requireAdmin,
  quizController.createQuiz,
);
router.put(
  "/:courseId/quizzes/:quizId",
  authenticate,
  requireAdmin,
  quizController.updateQuiz,
);
router.delete(
  "/:courseId/quizzes/:quizId",
  authenticate,
  requireAdmin,
  quizController.deleteQuiz,
);

export default router;
