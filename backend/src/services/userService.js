import { ApiError } from "../utils/ApiError.js";

/**
 * User service — architecture only. Database queries are not implemented yet.
 */

export async function getAllUsers() {
  throw new ApiError(501, "List users is not implemented yet.");
}

export async function getUserById(userId) {
  throw new ApiError(501, `Get user ${userId} is not implemented yet.`);
}

export async function updateUser(userId, payload) {
  throw new ApiError(501, `Update user ${userId} is not implemented yet.`);
}

export async function deleteUser(userId) {
  throw new ApiError(501, `Delete user ${userId} is not implemented yet.`);
}

export async function updateProfile(userId, payload) {
  throw new ApiError(501, `Update profile ${userId} is not implemented yet.`);
}
