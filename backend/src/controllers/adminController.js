import { asyncHandler } from "../utils/asyncHandler.js";
import { success } from "../utils/apiResponse.js";

/**
 * Admin controller — placeholder. Admin-only aggregated operations.
 */
export const getStats = asyncHandler(async (req, res) => {
  success(res, null, "Get admin stats — not implemented yet.");
});

export const getRecentActivities = asyncHandler(async (req, res) => {
  success(res, null, "Get admin recent activities — not implemented yet.");
});
