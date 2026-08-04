import { asyncHandler } from "../utils/asyncHandler.js";
import { success } from "../utils/apiResponse.js";

/**
 * Profile controller — placeholder. Dedicated to the profile update endpoint
 * so the user's profile persists correctly across requests.
 */
export const getProfile = asyncHandler(async (req, res) => {
  success(res, null, "Get profile — not implemented yet.");
});

export const updateProfile = asyncHandler(async (req, res) => {
  success(res, null, "Update profile — not implemented yet.");
});
