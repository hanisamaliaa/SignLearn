import { asyncHandler } from "../utils/asyncHandler.js";
import { success } from "../utils/apiResponse.js";

export const getAllUsers = asyncHandler(async (req, res) => {
  success(res, null, "List users — not implemented yet.");
});

export const getUserById = asyncHandler(async (req, res) => {
  success(res, null, `Get user ${req.params.id} — not implemented yet.`);
});

export const updateUser = asyncHandler(async (req, res) => {
  success(res, null, `Update user ${req.params.id} — not implemented yet.`);
});

export const deleteUser = asyncHandler(async (req, res) => {
  success(res, null, `Delete user ${req.params.id} — not implemented yet.`);
});

export const updateProfile = asyncHandler(async (req, res) => {
  success(res, null, `Update profile — not implemented yet.`);
});
