import { query } from "../config/database.js";

/**
 * Repository refresh token.
 *
 * Yang tersimpan hanya SHA-256 dari token; nilai mentahnya hanya ada di
 * cookie klien. Dump database yang bocor tidak memberi penyerang satu pun
 * sesi yang dapat dipakai.
 */

export async function insert(
  { userId, tokenHash, familyId, expiresAt, userAgent, ipAddress },
  client,
) {
  const run = client ? client.query.bind(client) : query;
  const { rows } = await run(
    `INSERT INTO refresh_tokens
       (user_id, token_hash, family_id, expires_at, user_agent, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [
      userId,
      tokenHash,
      familyId,
      expiresAt,
      userAgent?.slice(0, 255) ?? null,
      ipAddress ?? null,
    ],
  );
  return String(rows[0].id);
}

/** Mengambil token berdasarkan hash, termasuk yang sudah dirotasi atau dicabut. */
export async function findByHash(tokenHash) {
  const { rows } = await query(
    `SELECT id, user_id, token_hash, family_id, expires_at,
            rotated_at, revoked_at, created_at
       FROM refresh_tokens
      WHERE token_hash = $1
      LIMIT 1`,
    [tokenHash],
  );
  if (!rows[0]) return null;

  const r = rows[0];
  return {
    id: String(r.id),
    userId: String(r.user_id),
    familyId: r.family_id,
    expiresAt: r.expires_at,
    rotatedAt: r.rotated_at,
    revokedAt: r.revoked_at,
    createdAt: r.created_at,
    isActive: !r.rotated_at && !r.revoked_at && r.expires_at > new Date(),
  };
}

export async function markRotated(id, client) {
  const run = client ? client.query.bind(client) : query;
  await run(`UPDATE refresh_tokens SET rotated_at = NOW() WHERE id = $1`, [id]);
}

/**
 * Mencabut SELURUH token dalam satu family.
 *
 * Dipanggil ketika token yang sudah dirotasi dipakai lagi — indikasi kuat
 * bahwa token dicuri. Kita tidak tahu apakah yang memakai adalah penyerang
 * atau pengguna sah, jadi seluruh rantai sesi dibunuh dan keduanya dipaksa
 * login ulang. Ini rekomendasi OWASP untuk refresh token rotation.
 */
export async function revokeFamily(familyId, client) {
  const run = client ? client.query.bind(client) : query;
  const { rowCount } = await run(
    `UPDATE refresh_tokens
        SET revoked_at = NOW()
      WHERE family_id = $1 AND revoked_at IS NULL`,
    [familyId],
  );
  return rowCount;
}

/** Mencabut seluruh sesi milik pengguna — dipakai saat logout-all & reset password. */
export async function revokeAllForUser(userId, client) {
  const run = client ? client.query.bind(client) : query;
  const { rowCount } = await run(
    `UPDATE refresh_tokens
        SET revoked_at = NOW()
      WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId],
  );
  return rowCount;
}

export async function revokeByHash(tokenHash) {
  const { rowCount } = await query(
    `UPDATE refresh_tokens
        SET revoked_at = NOW()
      WHERE token_hash = $1 AND revoked_at IS NULL`,
    [tokenHash],
  );
  return rowCount;
}

/**
 * Membuang token kedaluwarsa yang sudah lewat masa simpannya.
 *
 * Token yang sudah lewat expiry tetap disimpan 30 hari sebagai jejak audit —
 * ia yang memungkinkan deteksi pemakaian ulang tetap bekerja untuk token
 * yang dicuri lalu dipakai terlambat.
 */
export async function purgeExpired(retentionDays = 30) {
  const { rowCount } = await query(
    `DELETE FROM refresh_tokens
      WHERE expires_at < NOW() - ($1 || ' days')::INTERVAL`,
    [String(retentionDays)],
  );
  return rowCount;
}

/** Daftar sesi aktif — untuk halaman "perangkat yang masuk". */
export async function listActiveForUser(userId) {
  const { rows } = await query(
    `SELECT id, user_agent, ip_address, created_at, expires_at
       FROM refresh_tokens
      WHERE user_id = $1
        AND revoked_at IS NULL
        AND rotated_at IS NULL
        AND expires_at > NOW()
      ORDER BY created_at DESC`,
    [userId],
  );
  return rows.map((r) => ({
    id: String(r.id),
    userAgent: r.user_agent,
    ipAddress: r.ip_address,
    createdAt: r.created_at.toISOString(),
    expiresAt: r.expires_at.toISOString(),
  }));
}
