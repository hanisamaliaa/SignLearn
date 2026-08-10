import { asyncHandler } from "../utils/asyncHandler.js";
import { success } from "../utils/apiResponse.js";
import * as userService from "../services/userService.js";

/**
 * Profile controller — profil milik pemanggil sendiri (API Contract §7.1-7.2).
 *
 * `req.user.id` berasal dari klaim JWT yang ditandatangani server, BUKAN dari
 * body maupun parameter. Itulah yang membuat endpoint ini mustahil dipakai
 * untuk membaca atau menulis profil orang lain: tidak ada id yang dapat
 * dikirim klien.
 */

// ─── GET /users/profile ──────────────────────────────────────────────────
export const getProfile = asyncHandler(async (req, res) => {
  const user = await userService.getProfile(req.user.id);
  success(res, { user }, "Profil berhasil diambil.");
});

// ─── PUT /users/profile ──────────────────────────────────────────────────
export const updateProfile = asyncHandler(async (req, res) => {
  const user = await userService.updateProfile(req.user.id, req.body);
  success(res, { user }, "Profil berhasil diperbarui.");
});
