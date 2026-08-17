import bcrypt from "bcryptjs";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";
import { ERROR_CODES } from "../constants/errorCodes.js";
import {
  generateEmailVerificationCode,
  generateResetCode,
  hashEmailVerificationCode,
  hashResetCode,
  safeEqual,
} from "../utils/crypto.js";
import { withTransaction } from "../config/database.js";
import * as userRepo from "../repositories/userRepository.js";
import * as resetRepo from "../repositories/passwordResetRepository.js";
import * as verificationRepo from "../repositories/emailVerificationRepository.js";
import * as tokenService from "./tokenService.js";
import { sendPasswordResetCode, sendRegistrationVerificationCode } from "./mailer.js";

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
  const normalizedEmail = email.trim().toLowerCase();
  const passwordHash = await hashPassword(password);
  const code = env.security.emailVerificationEnabled
    ? generateEmailVerificationCode()
    : null;

  let result;
  try {
    result = await withTransaction(async (client) => {
      if (await userRepo.emailExists(normalizedEmail, client)) {
        throw ApiError.conflict("Email ini sudah terdaftar.");
      }

      const user = await userRepo.create(
        {
          name,
          email: normalizedEmail,
          passwordHash,
          profile: profile || "general",
          role: "user",
        },
        client,
      );

      if (env.security.emailVerificationEnabled) {
        const expiresAt = new Date(
          Date.now() + env.security.emailVerificationTtlMinutes * 60_000,
        );
        await verificationRepo.insert(
          {
            userId: user.id,
            tokenHash: hashEmailVerificationCode(user.id, code, env.jwt.accessSecret),
            expiresAt,
          },
          client,
        );
        return { user, verificationRequired: true };
      }

      await userRepo.markEmailVerified(user.id, client);
      const verifiedUser = await userRepo.findById(user.id, client);
      const refresh = await tokenService.issueRefreshToken(verifiedUser.id, context, client);
      return {
        user: verifiedUser,
        accessToken: tokenService.signAccessToken(verifiedUser),
        refreshToken: refresh.token,
        expiresIn: env.jwt.accessTtlSeconds,
        verificationRequired: false,
      };
    });
  } catch (error) {
    if (error?.code === "23505") throw ApiError.conflict("Email ini sudah terdaftar.");
    throw error;
  }

  if (result.verificationRequired) {
    await sendRegistrationVerificationCode({
      to: result.user.email,
      name: result.user.name,
      code,
      expiresMinutes: env.security.emailVerificationTtlMinutes,
    });
    return {
      verificationRequired: true,
      email: result.user.email,
      expiresInMinutes: env.security.emailVerificationTtlMinutes,
      resendCooldownSeconds: env.security.emailVerificationResendCooldownSeconds,
    };
  }

  return result;
}

export async function verifyEmail({ email, code }, context = {}) {
  const invalid = () =>
    ApiError.unauthorized(
      "Kode verifikasi tidak valid atau sudah kedaluwarsa. Minta kode baru untuk melanjutkan.",
      ERROR_CODES.TOKEN_INVALID,
    );

  const user = await userRepo.findByEmailWithSecret(email);
  if (!user || user.emailVerified) throw invalid();

  const record = await verificationRepo.findActiveForUser(user.id);
  if (!record) throw invalid();
  const expected = hashEmailVerificationCode(user.id, code, env.jwt.accessSecret);
  if (!safeEqual(record.tokenHash, expected)) {
    await verificationRepo.registerFailedAttempt(
      record.id,
      env.security.emailVerificationMaxAttempts,
    );
    throw invalid();
  }

  return withTransaction(async (client) => {
    const consumed = await verificationRepo.consume(record.id, user.id, client);
    if (!consumed) throw invalid();
    const marked = await userRepo.markEmailVerified(user.id, client);
    if (!marked) throw invalid();
    const verifiedUser = await userRepo.findById(user.id, client);
    const refresh = await tokenService.issueRefreshToken(verifiedUser.id, context, client);
    return {
      user: verifiedUser,
      accessToken: tokenService.signAccessToken(verifiedUser),
      refreshToken: refresh.token,
      expiresIn: env.jwt.accessTtlSeconds,
    };
  });
}

export async function resendEmailVerification(email) {
  const user = await userRepo.findByEmailWithSecret(email);
  if (!user || user.emailVerified || user.role !== "user") return;

  let code = null;
  await withTransaction(async (client) => {
    await client.query("SELECT id FROM users WHERE id = $1 FOR UPDATE", [user.id]);
    const latest = await verificationRepo.latestForUser(user.id, client);
    const cooldownMs = env.security.emailVerificationResendCooldownSeconds * 1000;
    if (latest && Date.now() - new Date(latest).getTime() < cooldownMs) return;

    code = generateEmailVerificationCode();
    await verificationRepo.invalidateForUser(user.id, client);
    await verificationRepo.insert(
      {
        userId: user.id,
        tokenHash: hashEmailVerificationCode(user.id, code, env.jwt.accessSecret),
        expiresAt: new Date(
          Date.now() + env.security.emailVerificationTtlMinutes * 60_000,
        ),
      },
      client,
    );
  });

  if (code) {
    await sendRegistrationVerificationCode({
      to: user.email,
      name: user.name,
      code,
      expiresMinutes: env.security.emailVerificationTtlMinutes,
    });
  }
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

  if (record.role === "user" && !record.emailVerified) {
    throw ApiError.forbidden(
      "Verifikasi alamat email sebelum masuk.",
      ERROR_CODES.EMAIL_NOT_VERIFIED,
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
  if (user.role === "user" && !user.emailVerified) {
    await tokenService.revokeAllSessions(user.id);
    throw ApiError.forbidden(
      "Verifikasi alamat email sebelum melanjutkan.",
      ERROR_CODES.EMAIL_NOT_VERIFIED,
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
 * Kode hanya keluar melalui kanal email (atau log backend bila SMTP tidak
 * tersedia) dan tidak pernah menjadi nilai balik yang dapat mencapai klien.
 */
export async function requestPasswordReset(email) {
  const user = await userRepo.findByEmailWithSecret(email);
  if (!user) return;

  await resetRepo.invalidateForUser(user.id);

  const code = generateResetCode();
  const expiresMinutes = env.security.passwordResetTtlMinutes;
  await resetRepo.insert({
    userId: user.id,
    // Hash MENGIKAT kode ke penggunanya; lihat `hashResetCode`.
    tokenHash: hashResetCode(user.id, code),
    expiresAt: new Date(Date.now() + expiresMinutes * 60_000),
  });

  // Kegagalan pengiriman tidak dilempar. Controller membalas hal yang sama
  // entah email terkirim atau tidak, karena membedakannya akan membocorkan
  // email mana yang memiliki akun; `sendMail` sudah mencatat galatnya.
  await sendPasswordResetCode({
    to: user.email,
    name: user.name,
    code,
    expiresMinutes,
  });
}

/**
 * Menyelesaikan reset kata sandi.
 *
 * Mengganti kata sandi DAN mencabut seluruh sesi. Kalau seseorang mereset
 * karena curiga akunnya diretas, membiarkan sesi penyerang tetap hidup
 * membuat seluruh tindakan itu sia-sia.
 */
export async function resetPassword({ email, code, password }) {
  // Pesan tunggal untuk email tidak dikenal, kode salah, kode kedaluwarsa,
  // kode sudah terpakai, dan kode yang habis percobaan. Membedakannya memberi
  // tahu penyerang bahwa kodenya PERNAH benar, atau bahwa emailnya terdaftar.
  const invalid = () =>
    ApiError.unauthorized(
      "Kode reset tidak valid atau sudah kedaluwarsa. Minta kode baru untuk melanjutkan.",
      ERROR_CODES.TOKEN_INVALID,
    );

  const user = await userRepo.findByEmailWithSecret(email);
  if (!user) throw invalid();

  const record = await resetRepo.findActiveForUser(user.id);
  if (!record) throw invalid();

  if (record.tokenHash !== hashResetCode(user.id, code)) {
    await resetRepo.registerFailedAttempt(
      record.id,
      env.security.passwordResetMaxAttempts,
    );
    throw invalid();
  }

  const passwordHash = await hashPassword(password);

  // Konsumsi kode dilakukan lebih dulu di transaksi yang sama. Klausa atomik
  // pada `consume` memastikan dua submit bersamaan tidak dapat sama-sama
  // memakai kode yang sama dan saling menimpa kata sandi baru.
  await withTransaction(async (client) => {
    const consumed = await resetRepo.consume(record.id, record.userId, client);
    if (!consumed) throw invalid();

    const updated = await userRepo.updatePassword(record.userId, passwordHash, client);
    if (!updated) throw invalid();

    // Pencabutan sesi ikut transaksi. API tidak boleh menjawab gagal setelah
    // password telanjur berubah hanya karena langkah pencabutan berikutnya
    // gagal pada koneksi terpisah.
    await tokenService.revokeAllSessions(record.userId, client);
  });
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

  const passwordHash = await hashPassword(newPassword);
  await withTransaction(async (client) => {
    const updated = await userRepo.updatePassword(userId, passwordHash, client);
    if (!updated) throw ApiError.notFound("Pengguna tidak ditemukan.");
    await tokenService.revokeAllSessions(userId, client);
  });
}

export async function getCurrentUser(userId) {
  const user = await userRepo.findById(userId);
  if (!user) throw ApiError.notFound("Pengguna tidak ditemukan.");
  return user;
}
