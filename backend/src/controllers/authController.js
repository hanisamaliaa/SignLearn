import { asyncHandler } from "../utils/asyncHandler.js";
import { success, created } from "../utils/apiResponse.js";

/**
 * Auth controller — placeholder. Controllers wire HTTP requests to services.
 * Actual logic will be implemented when the database layer is ready.
 */

export const register = asyncHandler(async (req, res) => {
  // POST /api/auth/register
  created(res, null, "Registration endpoint — not implemented yet.");
});

export const login = asyncHandler(async (req, res) => {
  // POST /api/auth/login
  success(res, null, "Login endpoint — not implemented yet.");
});

export const me = asyncHandler(async (req, res) => {
  // GET /api/auth/me
  // req.user is set by authenticate middleware.
  success(res, { user: req.user }, "Current user retrieved.");
});

export const refreshToken = asyncHandler(async (req, res) => {
  // POST /api/auth/refresh
  success(res, null, "Refresh token endpoint — not implemented yet.");
});

export const forgotPassword = asyncHandler(async (req, res) => {
  // POST /api/auth/forgot-password
  success(res, null, "Forgot password endpoint — not implemented yet.");
});

export const resetPassword = asyncHandler(async (req, res) => {
  // POST /api/auth/reset-password
  success(res, null, "Reset password endpoint — not implemented yet.");
});
