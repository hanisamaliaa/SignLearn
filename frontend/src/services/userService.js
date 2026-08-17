import { request } from "./api";
import { uploadImage } from "./mediaService";

/**
 * Profil sendiri & administrasi pengguna — API Contract §7.
 *
 * Berkas ini sebelumnya adalah repository localStorage: seed akun demo,
 * hashing kata sandi di browser, dan penyimpanan pengguna di perangkat.
 * Seluruhnya kini dikerjakan backend — dan hashing di browser memang tidak
 * pernah memberi jaminan apa pun: yang menentukan keamanan adalah bcrypt di
 * server.
 */

export async function getProfile() {
  const payload = await request({ url: "/users/profile" });
  return payload.user;
}

/** `email`, `role`, `status` diabaikan server secara diam-diam (§7.2). */
export async function updateProfile(data) {
  const payload = await request({ method: "put", url: "/users/profile", data });
  return payload.user;
}

export async function uploadProfileAvatar(file) {
  const payload = await uploadImage("/users/profile/avatar", file);
  return payload.user;
}

// ─── Admin ───────────────────────────────────────────────────────────────

export async function getUsers(params = {}) {
  return request({ url: "/users", params });
}

export async function getUserById(userId) {
  return request({ url: `/users/${userId}` });
}

export async function updateUser(userId, data) {
  const payload = await request({ method: "put", url: `/users/${userId}`, data });
  return payload.user;
}

/** Soft delete — status menjadi `inactive`, barisnya tidak dihapus (§7.6). */
export async function deactivateUser(userId) {
  return request({ method: "delete", url: `/users/${userId}` });
}
