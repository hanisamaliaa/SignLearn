import { Router } from "express";
import * as dashboardController from "../controllers/dashboardController.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requireAdmin } from "../middleware/rbac.middleware.js";

const router = Router();

// User dashboard.
router.get("/me", authenticate, dashboardController.getUserDashboard);

// Admin dashboard & reports (admin only).
router.get(
  "/admin",
  authenticate,
  requireAdmin,
  dashboardController.getAdminDashboard,
);
router.get(
  "/admin/reports",
  authenticate,
  requireAdmin,
  dashboardController.getAdminReports,
);

export default router;
