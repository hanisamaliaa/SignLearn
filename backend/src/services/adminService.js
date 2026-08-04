import { ApiError } from "../utils/ApiError.js";

/**
 * Admin service — architecture only. Database queries are not implemented yet.
 * These are admin-only aggregated operations.
 */

export async function getStats() {
  throw new ApiError(501, "Get admin stats is not implemented yet.");
}

export async function getRecentActivities() {
  throw new ApiError(501, "Get recent activities is not implemented yet.");
}

export async function manageUsers() {
  throw new ApiError(501, "Manage users is not implemented yet.");
}
