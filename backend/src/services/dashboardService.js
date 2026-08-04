import { ApiError } from "../utils/ApiError.js";

/**
 * Dashboard service — architecture only. Database queries are not implemented yet.
 */

// User dashboard
export async function getUserDashboard(userId) {
  throw new ApiError(
    501,
    `Get user dashboard ${userId} is not implemented yet.`,
  );
}

// Admin dashboard
export async function getAdminDashboard() {
  throw new ApiError(501, "Get admin dashboard is not implemented yet.");
}

// Admin reports
export async function getAdminReports() {
  throw new ApiError(501, "Get admin reports is not implemented yet.");
}
