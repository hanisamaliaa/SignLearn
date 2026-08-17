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
  if (payload.verificationRequired) return payload;
  setAccessToken(payload.accessToken);
  return { user: payload.user, verificationRequired: false };
}

export async function verifyEmail(email, code) {
  const payload = await request({
    method: "post", url: "/auth/verify-email", data: { email, code },
  });
  setAccessToken(payload.accessToken);
  return payload.user;
}

export function resendEmailVerification(email) {
  return request({
    method: "post", url: "/auth/verify-email/resend", data: { email },
  });
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
  } catch {
    // Logout harus tetap selesai di sisi klien meski request server gagal.
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

/**
 * Menyetel kata sandi baru dengan kode dari email.
 *
 * Email ikut dikirim karena server mencari kodenya per pengguna: kode enam
 * digit yang dicari lewat hash-nya sendiri akan cocok dengan reset milik siapa
 * saja yang sedang aktif.
 */
export async function resetPassword(email, code, password) {
  return request({
    method: "post", url: "/auth/reset-password", data: { email, code, password },
  });
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
