import { asyncHandler } from "../utils/asyncHandler.js";
import { success } from "../utils/apiResponse.js";
import * as userService from "../services/userService.js";

/**
 * User controller — administrasi pengguna (API Contract §7.3-7.6).
 *
 * Seluruh rute di sini dijaga `authenticate` + `requireAdmin` di router.
 * Controller tidak memeriksa peran sendiri: satu tempat pemeriksaan berarti
 * satu tempat yang bisa lupa diperbarui.
 *
 * `req.user` diteruskan ke service sebagai `actor` karena beberapa aturan
 * bergantung pada SIAPA yang bertindak — admin tidak boleh menurunkan peran
 * atau menghapus dirinya sendiri (§7.5, §7.6).
 */

// ─── GET /users ──────────────────────────────────────────────────────────
export const getAllUsers = asyncHandler(async (req, res) => {
  const { q, role, status, page, limit, sortBy, sortDir } = req.query;

  const result = await userService.list(
    { q, role, status },
    { page, limit, sortBy, sortDir },
  );

  success(res, result, "Daftar pengguna berhasil diambil.");
});

// ─── GET /users/:id ──────────────────────────────────────────────────────
export const getUserById = asyncHandler(async (req, res) => {
  const result = await userService.getById(req.params.id);
  success(res, result, "Detail pengguna berhasil diambil.");
});

// ─── PUT /users/:id ──────────────────────────────────────────────────────
export const updateUser = asyncHandler(async (req, res) => {
  const user = await userService.updateByAdmin(req.params.id, req.body, req.user);
  success(res, { user }, "Pengguna berhasil diperbarui.");
});

// ─── DELETE /users/:id ───────────────────────────────────────────────────
export const deleteUser = asyncHandler(async (req, res) => {
  await userService.remove(req.params.id, req.user);
  success(res, null, "Pengguna berhasil dinonaktifkan.");
});
