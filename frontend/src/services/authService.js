import { request, setAccessToken, clearAccessToken } from "./api";

/**
 * Auth — API Contract §6.
 *
 * Refresh token tidak pernah disentuh berkas ini: ia cookie HttpOnly yang
 * dikelola browser. Yang disimpan di sini hanya access token, di memori.
 */

export async function login(email, password) {
  const payload = await request({
    method: "post", url: "/auth/login", data: { email, password },
  });
  setAccessToken(payload.accessToken);
  return payload.user;
}

export async function register({ name, email, password, profile }) {
  const payload = await request({
    method: "post", url: "/auth/register", data: { name, email, password, profile },
  });
  setAccessToken(payload.accessToken);
  return payload.user;
}

/**
 * Keluar.
 *
 * Token di memori dibersihkan APA PUN hasil panggilan jaringannya. Kalau
 * server tidak terjangkau, pengguna yang menekan "keluar" tetap harus keluar
 * dari sisi klien.
 */
export async function logout() {
  try {
    await request({ method: "post", url: "/auth/logout" });
  } finally {
    clearAccessToken();
  }
}

export async function getCurrentUser() {
  const payload = await request({ url: "/auth/me" });
  return payload.user;
}

export async function requestPasswordReset(email) {
  return request({ method: "post", url: "/auth/forgot-password", data: { email } });
}

export async function resetPassword(token, password) {
  return request({ method: "post", url: "/auth/reset-password", data: { token, password } });
}

export async function changePassword(currentPassword, newPassword) {
  return request({
    method: "post", url: "/auth/change-password",
    data: { currentPassword, newPassword },
  });
}

export async function listSessions() {
  const payload = await request({ url: "/auth/sessions" });
  return payload.items;
}
