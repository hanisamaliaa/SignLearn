import { Router } from "express";
import * as progressController from "../controllers/progressController.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requireUser } from "../middleware/rbac.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { validateUpdateProgress } from "../validators/progressValidator.js";

const router = Router();

/**
 * Rute progres belajar — seluruhnya milik peran `user`.
 *
 * Admin ditolak dengan sengaja: mereka tidak memiliki baris progres, dan
 * membiarkannya menulis akan mencemari laporan admin dengan data yang bukan
 * berasal dari pembelajar sungguhan (API Contract §4).
 *
 * Versi sebelumnya tidak memasang middleware sama sekali dan controller-nya
 * memakai `userId = 1` yang di-hardcode.
 */
router.use(authenticate, requireUser);

router.get("/", progressController.getUserProgress);
router.get("/quiz-history", progressController.getQuizHistory);
router.get("/quiz-results/:resultId", progressController.getQuizResultDetail);
router.get("/courses/:courseId", progressController.getCourseAccess);

router.put(
  "/lessons/:lessonId",
  validate(validateUpdateProgress),
  progressController.updateLessonProgress,
);

export default router;
