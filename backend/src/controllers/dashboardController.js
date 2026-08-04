import { asyncHandler } from "../utils/asyncHandler.js";
import { success } from "../utils/apiResponse.js";

export const getUserDashboard = asyncHandler(async (req, res) => {
  success(res, null, "Get user dashboard — not implemented yet.");
});

export const getAdminDashboard = asyncHandler(async (req, res) => {
  success(res, null, "Get admin dashboard — not implemented yet.");
});

export const getAdminReports = asyncHandler(async (req, res) => {
  success(res, null, "Get admin reports — not implemented yet.");
});
