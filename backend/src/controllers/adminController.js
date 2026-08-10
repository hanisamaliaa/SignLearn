import { asyncHandler } from "../utils/asyncHandler.js";
import { success } from "../utils/apiResponse.js";
import * as adminService from "../services/adminService.js";

/**
 * Admin controller — HTTP saja (API Contract §10.6).
 *
 * Seluruh rute di router `/admin` sudah dijaga `authenticate` + `requireAdmin`
 * lewat satu `router.use()`, jadi controller tidak memeriksa peran lagi.
 */

// ─── GET /admin/stats ────────────────────────────────────────────────────
export const getStats = asyncHandler(async (_req, res) => {
  const result = await adminService.getStats();
  success(res, result, "Statistik berhasil diambil.");
});

// ─── GET /admin/activities ───────────────────────────────────────────────
export const getRecentActivities = asyncHandler(async (req, res) => {
  const { type, page, limit } = req.query;
  const result = await adminService.getRecentActivities({ type }, { page, limit });
  success(res, result, "Aktivitas terbaru berhasil diambil.");
});
