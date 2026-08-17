import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";
import { ERROR_CODES } from "../constants/errorCodes.js";
import { generateOpaqueToken, hashToken, randomUuid } from "../utils/crypto.js";
import { withTransaction } from "../config/database.js";
import * as refreshRepo from "../repositories/refreshTokenRepository.js";

/**
 * Token service — strategi hibrida.
 *
 *   Access token   JWT, 15 menit, STATELESS.
 *                  Diverifikasi lewat tanda tangan saja; tidak menyentuh
 *                  database, sehingga setiap request tetap murah.
 *
 *   Refresh token  Acak opaque, 7 hari, STATEFUL.
 *                  Tercatat di database sebagai hash. Dapat dicabut seketika,
 *                  dirotasi setiap pemakaian, dan pemakaian ulangnya terdeteksi.
 *
 * Kenapa refresh token BUKAN JWT: JWT tidak dapat dicabut. Pengguna menekan
 * "keluar", tetapi tokennya tetap sah sampai kedaluwarsa. Untuk kredensial
 * berumur 7 hari, itu tidak dapat diterima.
 */

// ─── Access token (stateless) ────────────────────────────────────────────

export function signAccessToken(user) {
  return jwt.sign(
    { email: user.email, role: user.role },
    env.jwt.accessSecret,
    {
      subject: String(user.id),
      expiresIn: env.jwt.accessTtlSeconds,
      issuer: env.jwt.issuer,
      audience: env.jwt.audience,
      algorithm: "HS256",
    },
  );
}

export function verifyAccessToken(token) {
  // issuer & audience diverifikasi eksplisit. Tanpa keduanya, token yang
  // diterbitkan sistem lain dengan secret yang sama akan diterima di sini.
  //
  // `algorithms` dikunci ke HS256. Tanpa itu, penyerang dapat mengirim token
  // ber-header `alg: "none"` dan sebagian implementasi akan menerimanya
  // tanpa memverifikasi tanda tangan sama sekali.
  return jwt.verify(token, env.jwt.accessSecret, {
    issuer: env.jwt.issuer,
    audience: env.jwt.audience,
    algorithms: ["HS256"],
  });
}

// ─── Refresh token (stateful) ────────────────────────────────────────────

function refreshExpiryDate() {
  return new Date(Date.now() + env.refreshToken.ttlDays * 24 * 60 * 60 * 1000);
}

/**
 * Menerbitkan refresh token baru dalam family baru — dipakai saat login.
 * @returns {Promise<{token: string, familyId: string, expiresAt: Date}>}
 */
export async function issueRefreshToken(userId, context = {}) {
  const token = generateOpaqueToken(env.refreshToken.bytes);
  const familyId = randomUuid();
  const expiresAt = refreshExpiryDate();

  await refreshRepo.insert({
    userId,
    tokenHash: hashToken(token),
    familyId,
    expiresAt,
    userAgent: context.userAgent,
    ipAddress: context.ipAddress,
  });

  return { token, familyId, expiresAt };
}

/**
 * Menukar refresh token dengan pasangan token baru — rotasi + deteksi reuse.
 *
 * Alur:
 *   1. Token tidak dikenal        → 401, tidak ada yang dicabut
 *   2. Token sudah dirotasi/dicabut → PENCURIAN. Cabut seluruh family, 401
 *   3. Token kedaluwarsa          → 401
 *   4. Token sah                  → tandai dirotasi, terbitkan penerus
 *
 * Langkah 2 adalah inti keamanannya. Setelah token ditukar, ia tidak boleh
 * muncul lagi. Kalau muncul, berarti ada dua pihak memegang token yang sama —
 * dan kita tidak tahu mana yang sah. Membunuh seluruh rantai memaksa keduanya
 * login ulang, dan penyerang tidak punya kata sandi.
 *
 * @returns {Promise<{userId: string, token: string, expiresAt: Date}>}
 */
export async function rotateRefreshToken(rawToken, context = {}) {
  const tokenHash = hashToken(rawToken);
  const existing = await refreshRepo.findByHash(tokenHash);

  if (!existing) {
    throw ApiError.unauthorized("Sesi tidak valid.", ERROR_CODES.TOKEN_INVALID);
  }

  if (existing.rotatedAt || existing.revokedAt) {
    await refreshRepo.revokeFamily(existing.familyId);
    console.warn(
      `[security] Refresh token dipakai ulang — family ${existing.familyId} dicabut (user ${existing.userId}).`,
    );
    throw ApiError.unauthorized(
      "Sesi tidak valid. Silakan masuk kembali.",
      ERROR_CODES.TOKEN_REUSED,
    );
  }

  if (existing.expiresAt <= new Date()) {
    throw ApiError.unauthorized("Sesi sudah berakhir.", ERROR_CODES.TOKEN_EXPIRED);
  }

  const token = generateOpaqueToken(env.refreshToken.bytes);
  const expiresAt = refreshExpiryDate();

  // Atomik: bila penyisipan penerus gagal setelah token lama ditandai
  // dirotasi, pengguna akan kehilangan sesi tanpa sebab yang terlihat.
  await withTransaction(async (client) => {
    await refreshRepo.markRotated(existing.id, client);
    await refreshRepo.insert(
      {
        userId: existing.userId,
        tokenHash: hashToken(token),
        familyId: existing.familyId, // family dipertahankan agar rantai terlacak
        expiresAt,
        userAgent: context.userAgent,
        ipAddress: context.ipAddress,
      },
      client,
    );
  });

  return { userId: existing.userId, token, expiresAt };
}

export async function revokeRefreshToken(rawToken) {
  if (!rawToken) return 0;
  return refreshRepo.revokeByHash(hashToken(rawToken));
}

export async function revokeAllSessions(userId, client) {
  return refreshRepo.revokeAllForUser(userId, client);
}

export async function listSessions(userId) {
  return refreshRepo.listActiveForUser(userId);
}
