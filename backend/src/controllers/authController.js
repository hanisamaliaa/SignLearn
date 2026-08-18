import { asyncHandler } from "../utils/asyncHandler.js";
import { success, created } from "../utils/apiResponse.js";
import {
  REFRESH_COOKIE_NAME,
  refreshCookieOptions,
  clearRefreshCookieOptions,
} from "../config/cookies.js";
import * as authService from "../services/authService.js";
import * as tokenService from "../services/tokenService.js";
import { env } from "../config/env.js";

/**
 * Auth controller — HTTP saja.
 *
 * Tanggung jawabnya hanya tiga: membaca request, memanggil service, dan
 * menulis respons beserta cookie. Tidak ada aturan bisnis di file ini.
 */

/** Konteks perangkat, untuk daftar sesi aktif dan jejak audit. */
function requestContext(req) {
  return {
    userAgent: req.get("user-agent"),
    ipAddress: req.ip,
  };
}

/**
 * Menulis refresh token ke cookie HttpOnly.
 *
 * Token TIDAK PERNAH dikirim di body respons. Kalau ia ada di body, frontend
 * harus menyimpannya sendiri — dan satu-satunya tempat penyimpanan yang
 * tersedia bagi JavaScript adalah tempat yang juga dapat dibaca XSS.
 */
function setRefreshCookie(res, token, rememberMe = false) {
  res.cookie(REFRESH_COOKIE_NAME, token, refreshCookieOptions(rememberMe));
}

function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE_NAME, clearRefreshCookieOptions());
}

/**
 * Payload sesi yang dikirim ke klien.
 *
 * Hanya access token yang keluar — disimpan frontend DI MEMORI, bukan
 * localStorage. Saat halaman dimuat ulang ia hilang, lalu dipulihkan diam-diam
 * lewat cookie refresh. Umur paparannya menjadi sependek masa hidup tab.
 */
function sessionPayload({ user, accessToken, expiresIn }) {
  return { user, accessToken, expiresIn, tokenType: "Bearer" };
}

// ─── POST /auth/register ─────────────────────────────────────────────────
export const register = asyncHandler(async (req, res) => {
  const { name, email, password, profile } = req.body;

  const result = await authService.register(
    { name, email, password, profile },
    requestContext(req),
  );

  if (result.verificationRequired) {
    created(res, result, "Akun dibuat. Periksa email untuk kode verifikasi.");
    return;
  }

  setRefreshCookie(res, result.refreshToken, result.rememberMe);
  created(res, sessionPayload(result), "Pendaftaran berhasil.");
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const result = await authService.verifyEmail(
    { email: req.body.email, code: req.body.code },
    requestContext(req),
  );
  setRefreshCookie(res, result.refreshToken, result.rememberMe);
  success(res, sessionPayload(result), "Email berhasil diverifikasi.");
});

export const resendEmailVerification = asyncHandler(async (req, res) => {
  await authService.resendEmailVerification(req.body.email);
  success(
    res,
    { resendCooldownSeconds: env.security.emailVerificationResendCooldownSeconds },
    "Bila akun masih menunggu verifikasi, kode baru telah dikirim.",
  );
});

// ─── POST /auth/login ────────────────────────────────────────────────────
export const login = asyncHandler(async (req, res) => {
  const { email, password, remember = false } = req.body;

  const result = await authService.login(
    { email, password, remember },
    requestContext(req),
  );

  setRefreshCookie(res, result.refreshToken, result.rememberMe);
  success(res, sessionPayload(result), "Berhasil masuk.");
});

// ─── POST /auth/refresh ──────────────────────────────────────────────────
export const refresh = asyncHandler(async (req, res) => {
  // Dibaca dari cookie. Body sengaja TIDAK diterima sebagai sumber alternatif:
  // menerima token dari body akan menghidupkan kembali pola penyimpanan di
  // sisi JavaScript yang justru ingin kita hilangkan.
  const token = req.cookies?.[REFRESH_COOKIE_NAME];

  const result = await authService.refresh(token, requestContext(req));

  setRefreshCookie(res, result.refreshToken, result.rememberMe);
  success(res, sessionPayload(result), "Sesi diperbarui.");
});

// ─── POST /auth/logout ───────────────────────────────────────────────────
export const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.cookies?.[REFRESH_COOKIE_NAME]);

  clearRefreshCookie(res);
  // Selalu 200, bahkan bila tidak ada sesi. Logout bersifat idempoten;
  // pengguna yang menekan keluar tidak perlu melihat error.
  success(res, null, "Berhasil keluar.");
});

// ─── POST /auth/logout-all ───────────────────────────────────────────────
export const logoutAll = asyncHandler(async (req, res) => {
  const revoked = await authService.logoutAll(req.user.id);

  clearRefreshCookie(res);
  success(res, { revokedSessions: revoked }, "Berhasil keluar dari semua perangkat.");
});

// ─── GET /auth/me ────────────────────────────────────────────────────────
export const me = asyncHandler(async (req, res) => {
  // Dibaca ulang dari database, bukan dari klaim token: token diterbitkan
  // hingga 15 menit lalu dan datanya bisa sudah basi.
  const user = await authService.getCurrentUser(req.user.id);
  success(res, { user }, "Data pengguna berhasil diambil.");
});

// ─── GET /auth/sessions ──────────────────────────────────────────────────
export const listSessions = asyncHandler(async (req, res) => {
  const sessions = await tokenService.listSessions(req.user.id);
  success(res, { items: sessions }, "Daftar sesi aktif.");
});

// ─── POST /auth/forgot-password ──────────────────────────────────────────
export const forgotPassword = asyncHandler(async (req, res) => {
  await authService.requestPasswordReset(req.body.email);

  // Respons IDENTIK baik email terdaftar maupun tidak, dan juga entah email
  // berhasil terkirim atau gagal. Membedakannya membocorkan email mana yang
  // memiliki akun. Kode tidak pernah dikirim ke frontend; pengembangan tanpa
  // SMTP membacanya dari log backend yang tidak dapat diakses pengguna.
  success(res, null, "Bila email terdaftar, kode reset telah dikirim.");
});

// ─── POST /auth/reset-password ───────────────────────────────────────────
export const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword({
    email: req.body.email,
    code: req.body.code,
    password: req.body.password,
  });

  clearRefreshCookie(res);
  success(res, null, "Kata sandi berhasil diubah. Silakan masuk kembali.");
});

// ─── POST /auth/change-password ──────────────────────────────────────────
export const changePassword = asyncHandler(async (req, res) => {
  await authService.changePassword(req.user.id, {
    currentPassword: req.body.currentPassword,
    newPassword: req.body.newPassword,
  });

  clearRefreshCookie(res);
  success(res, null, "Kata sandi berhasil diubah. Silakan masuk kembali.");
});
