import { Router } from "express";
import * as progressController from "../controllers/progressController.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", authenticate, progressController.getUserProgress);
router.put(
  "/lessons/:lessonId",
  authenticate,
  progressController.updateLessonProgress,
);

export default router;
