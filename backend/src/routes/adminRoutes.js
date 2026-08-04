import { Router } from "express";
import * as adminController from "../controllers/adminController.js";
import * as aiController from "../controllers/aiController.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requireAdmin } from "../middleware/rbac.middleware.js";

const router = Router();

// All admin routes require an authenticated admin.
router.use(authenticate, requireAdmin);

router.get("/stats", adminController.getStats);
router.get("/activities", adminController.getRecentActivities);

// AI feature placeholders (admin-managed).
router.post("/ai/subtitles/:lessonId", aiController.generateSubtitles);
router.post("/ai/quiz/:lessonId", aiController.generateQuiz);

export default router;
