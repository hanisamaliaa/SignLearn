import { query } from "../config/database.js";

/** Repository token reset kata sandi. Disimpan sebagai hash, sama seperti refresh token. */

export async function insert({ userId, tokenHash, expiresAt }) {
  const { rows } = await query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [userId, tokenHash, expiresAt],
  );
  return String(rows[0].id);
}

export async function findValidByHash(tokenHash) {
  const { rows } = await query(
    `SELECT id, user_id, expires_at, used_at
       FROM password_reset_tokens
      WHERE token_hash = $1
        AND used_at IS NULL
        AND expires_at > NOW()
      LIMIT 1`,
    [tokenHash],
  );
  if (!rows[0]) return null;
  return { id: String(rows[0].id), userId: String(rows[0].user_id) };
}

export async function markUsed(id, client) {
  const run = client ? client.query.bind(client) : query;
  await run(`UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1`, [id]);
}

/**
 * Membatalkan token yang belum terpakai milik pengguna.
 *
 * Dipanggil sebelum menerbitkan token baru, sehingga hanya ada satu tautan
 * reset yang berlaku pada satu waktu. Tanpa ini, seluruh tautan dari setiap
 * permintaan tetap sah dan memperbesar jendela serangan.
 */
export async function invalidateForUser(userId, client) {
  const run = client ? client.query.bind(client) : query;
  await run(
    `UPDATE password_reset_tokens
        SET used_at = NOW()
      WHERE user_id = $1 AND used_at IS NULL`,
    [userId],
  );
}
