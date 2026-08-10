import bcrypt from "bcryptjs";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";
import { ERROR_CODES } from "../constants/errorCodes.js";
import { generateOpaqueToken, hashToken } from "../utils/crypto.js";
import { withTransaction } from "../config/database.js";
import * as userRepo from "../repositories/userRepository.js";
import * as resetRepo from "../repositories/passwordResetRepository.js";
import * as tokenService from "./tokenService.js";

/**
 * Auth service — seluruh aturan bisnis autentikasi.
 *
 * Controller tidak memuat logika; ia hanya menerjemahkan HTTP ke pemanggilan
 * service dan kembali. Itu yang membuat aturan di sini dapat diuji tanpa
 * Express sama sekali.
 */

/**
 * Hash pembanding untuk akun yang tidak ada.
 *
 * Dipakai agar login untuk email yang tidak terdaftar tetap menjalankan
 * bcrypt dengan biaya yang sama. Tanpa ini, respons untuk email tidak dikenal
 * datang dalam ~1 ms sementara email dikenal butuh ~250 ms — selisih yang
 * cukup untuk memetakan seluruh daftar pengguna hanya dengan mengukur waktu.
 */
const DUMMY_HASH = bcrypt.hashSync("timing-attack-mitigation-placeholder", 12);

export function hashPassword(password) {
  return bcrypt.hash(password, env.security.bcryptRounds);
}

export function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

// ─── Register ────────────────────────────────────────────────────────────

export async function register({ name, email, password, profile }, context = {}) {
  if (await userRepo.emailExists(email)) {
    throw ApiError.conflict("Email ini sudah terdaftar.");
  }

  const user = await userRepo.create({
    name,
    email,
    passwordHash: await hashPassword(password),
    profile: profile || "general",
    role: "user", // Peran selalu 'user'. Admin hanya dibuat lewat seed.
  });

  const refresh = await tokenService.issueRefreshToken(user.id, context);

  return {
    user,
    accessToken: tokenService.signAccessToken(user),
    refreshToken: refresh.token,
    expiresIn: env.jwt.accessTtlSeconds,
  };
}

// ─── Login ───────────────────────────────────────────────────────────────

export async function login({ email, password }, context = {}) {
  const record = await userRepo.findByEmailWithSecret(email);

  // Selalu jalankan bcrypt, bahkan untuk email yang tidak ada (lihat DUMMY_HASH).
  const passwordMatches = await verifyPassword(password, record?.passwordHash ?? DUMMY_HASH);

  // Pesan identik untuk email tidak dikenal maupun kata sandi salah.
  // Membedakannya memberi tahu penyerang email mana yang terdaftar.
  if (!record || !passwordMatches) {
    if (record) {
      await userRepo.registerFailedLogin(
        record.id,
        env.security.maxFailedLogins,
        env.security.lockoutMinutes,
      );
    }
    throw ApiError.unauthorized(
      "Email atau kata sandi salah.",
      ERROR_CODES.INVALID_CREDENTIALS,
    );
  }

  // Penguncian diperiksa SETELAH kata sandi diverifikasi, sehingga endpoint
  // ini tidak dapat dipakai untuk mengetahui akun mana yang sedang terkunci.
  if (record.lockedUntil && new Date(record.lockedUntil) > new Date()) {
    const minutes = Math.ceil((new Date(record.lockedUntil) - Date.now()) / 60000);
    throw ApiError.forbidden(
      `Akun terkunci sementara karena terlalu banyak percobaan gagal. Coba lagi dalam ${minutes} menit.`,
      ERROR_CODES.ACCOUNT_LOCKED,
    );
  }

  if (record.status === "suspended") {
    throw ApiError.forbidden(
      "Akun Anda ditangguhkan. Hubungi administrator.",
      ERROR_CODES.ACCOUNT_SUSPENDED,
    );
  }
  if (record.status === "inactive") {
    throw ApiError.forbidden(
      "Akun Anda tidak aktif.",
      ERROR_CODES.ACCOUNT_SUSPENDED,
    );
  }

  await userRepo.clearFailedLogins(record.id);

  const { passwordHash, failedLoginAttempts, lockedUntil, ...user } = record;
  const refresh = await tokenService.issueRefreshToken(user.id, context);

  return {
    user,
    accessToken: tokenService.signAccessToken(user),
    refreshToken: refresh.token,
    expiresIn: env.jwt.accessTtlSeconds,
  };
}

// ─── Refresh ─────────────────────────────────────────────────────────────

export async function refresh(rawRefreshToken, context = {}) {
  if (!rawRefreshToken) {
    throw ApiError.unauthorized("Sesi tidak ditemukan.", ERROR_CODES.TOKEN_MISSING);
  }

  const rotated = await tokenService.rotateRefreshToken(rawRefreshToken, context);
  const user = await userRepo.findById(rotated.userId);

  // Akun bisa saja di-suspend atau dihapus setelah token terakhir diterbitkan.
  // Inilah keuntungan refresh token stateful: perubahan status berlaku dalam
  // hitungan menit, bukan menunggu 7 hari sampai token kedaluwarsa.
  if (!user) {
    await tokenService.revokeRefreshToken(rotated.token);
    throw ApiError.unauthorized("Sesi tidak valid.", ERROR_CODES.TOKEN_INVALID);
  }
  if (user.status !== "active") {
    await tokenService.revokeAllSessions(user.id);
    throw ApiError.forbidden(
      "Akun Anda tidak aktif.",
      ERROR_CODES.ACCOUNT_SUSPENDED,
    );
  }

  return {
    user,
    accessToken: tokenService.signAccessToken(user),
    refreshToken: rotated.token,
    expiresIn: env.jwt.accessTtlSeconds,
  };
}

// ─── Logout ──────────────────────────────────────────────────────────────

export async function logout(rawRefreshToken) {
  await tokenService.revokeRefreshToken(rawRefreshToken);
}

export async function logoutAll(userId) {
  return tokenService.revokeAllSessions(userId);
}

// ─── Password reset ──────────────────────────────────────────────────────

/**
 * Memulai reset kata sandi.
 *
 * SELALU sukses dari sudut pandang pemanggil, terdaftar atau tidak. Respons
 * yang berbeda akan mengubah endpoint ini menjadi alat enumerasi akun.
 *
 * @returns {Promise<{token: string|null}>} token hanya untuk dev/test
 */
export async function requestPasswordReset(email) {
  const user = await userRepo.findByEmailWithSecret(email);
  if (!user) return { token: null };

  await resetRepo.invalidateForUser(user.id);

  const token = generateOpaqueToken(32);
  await resetRepo.insert({
    userId: user.id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + env.security.passwordResetTtlMinutes * 60_000),
  });

  // TODO(BE): kirim email berisi tautan reset.
  // Token dikembalikan HANYA di non-produksi agar dapat diuji tanpa SMTP.
  return { token: env.isProduction ? null : token };
}

/**
 * Menyelesaikan reset kata sandi.
 *
 * Mengganti kata sandi DAN mencabut seluruh sesi. Kalau seseorang mereset
 * karena curiga akunnya diretas, membiarkan sesi penyerang tetap hidup
 * membuat seluruh tindakan itu sia-sia.
 */
export async function resetPassword({ token, password }) {
  const record = await resetRepo.findValidByHash(hashToken(token));
  if (!record) {
    throw ApiError.unauthorized(
      "Token reset tidak valid atau sudah kedaluwarsa.",
      ERROR_CODES.TOKEN_INVALID,
    );
  }

  const passwordHash = await hashPassword(password);

  // Keduanya WAJIB memakai `client` yang sama. Repository yang mengabaikannya
  // akan berjalan di koneksi lain dari pool, dan transaksi ini menjadi
  // jaminan kosong: token reset bisa tetap sah setelah kata sandi berubah.
  await withTransaction(async (client) => {
    await userRepo.updatePassword(record.userId, passwordHash, client);
    await resetRepo.markUsed(record.id, client);
  });

  await tokenService.revokeAllSessions(record.userId);
}

/** Ganti kata sandi oleh pengguna yang sedang masuk. */
export async function changePassword(userId, { currentPassword, newPassword }) {
  const record = await userRepo.findByIdWithSecret(userId);
  if (!record) throw ApiError.notFound("Pengguna tidak ditemukan.");

  if (!(await verifyPassword(currentPassword, record.passwordHash))) {
    throw ApiError.validation("Kata sandi saat ini salah.", [
      { field: "currentPassword", message: "Kata sandi saat ini salah." },
    ]);
  }

  await userRepo.updatePassword(userId, await hashPassword(newPassword));
  await tokenService.revokeAllSessions(userId);
}

export async function getCurrentUser(userId) {
  const user = await userRepo.findById(userId);
  if (!user) throw ApiError.notFound("Pengguna tidak ditemukan.");
  return user;
}
