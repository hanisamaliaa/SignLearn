import { Router } from "express";
import * as dashboardController from "../controllers/dashboardController.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requireAdmin } from "../middleware/rbac.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { validateReportQuery } from "../validators/reportValidator.js";

const router = Router();

/**
 * Rute dashboard (API Contract §10.3-10.5).
 *
 * `/admin/reports` didaftarkan SEBELUM `/admin`? Tidak perlu: keduanya adalah
 * path literal dengan jumlah segmen berbeda, jadi Express tidak dapat
 * mencocokkan salah satu ke yang lain. Urutan di sini hanya soal keterbacaan.
 */

// ─── Dashboard pembelajar ────────────────────────────────────────────────
router.get("/me", authenticate, dashboardController.getUserDashboard);

// ─── Dashboard & laporan admin ───────────────────────────────────────────
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
  validate(validateReportQuery),
  dashboardController.getAdminReports,
);

export default router;
