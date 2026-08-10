import { asyncHandler } from "../utils/asyncHandler.js";
import { success } from "../utils/apiResponse.js";
import * as dashboardService from "../services/dashboardService.js";

/**
 * Dashboard controller — HTTP saja (API Contract §10.3-10.5).
 *
 * `req.user.id` berasal dari klaim JWT yang ditandatangani server. Tidak ada
 * id pengguna yang diterima dari query maupun body: dashboard seseorang hanya
 * dapat dibaca oleh orang itu sendiri, dan itu dijamin oleh KETIADAAN
 * parameter, bukan oleh pemeriksaan yang bisa terlupa.
 */

// ─── GET /dashboard/me ───────────────────────────────────────────────────
export const getUserDashboard = asyncHandler(async (req, res) => {
  const result = await dashboardService.getUserDashboard(req.user.id);
  success(res, result, "Dashboard berhasil diambil.");
});

// ─── GET /dashboard/admin ────────────────────────────────────────────────
export const getAdminDashboard = asyncHandler(async (_req, res) => {
  const result = await dashboardService.getAdminDashboard();
  success(res, result, "Dashboard admin berhasil diambil.");
});

// ─── GET /dashboard/admin/reports ────────────────────────────────────────
export const getAdminReports = asyncHandler(async (req, res) => {
  const { from, to, groupBy } = req.query;
  const result = await dashboardService.getAdminReports({ from, to, groupBy });
  success(res, result, "Laporan berhasil dibuat.");
});
