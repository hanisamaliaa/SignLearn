import { Router } from "express";
import * as adminController from "../controllers/adminController.js";
import * as aiController from "../controllers/aiController.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requireAdmin } from "../middleware/rbac.middleware.js";
import * as lessonController from "../controllers/lessonController.js";
import * as courseController from "../controllers/courseController.js";

const router = Router();

// All admin routes require an authenticated admin.
router.use(authenticate, requireAdmin);

router.get("/stats", adminController.getStats);
router.get("/activities", adminController.getRecentActivities);

// Course
router.post("/courses", courseController.createCourse);
router.put("/courses/:id", courseController.updateCourse);
router.delete("/courses/:id", courseController.deleteCourse);

// Lesson
router.post("/lessons", lessonController.createLesson);
router.put("/lessons/:id", lessonController.updateLesson);
router.delete("/lessons/:id", lessonController.deleteLesson);

// AI feature placeholders (admin-managed).
router.post("/ai/subtitles/:lessonId", aiController.generateSubtitles);
router.post("/ai/quiz/:lessonId", aiController.generateQuiz);

export default router;
