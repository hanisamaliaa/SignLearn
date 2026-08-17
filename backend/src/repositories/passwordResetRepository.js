import { query } from "../config/database.js";

/**
 * Repository kode reset kata sandi.
 *
 * Yang tersimpan adalah SHA-256 dari `userId:kode`, bukan kodenya. Dump
 * database yang bocor tidak memberi penyerang satu pun kode yang dapat
 * dipakai.
 */

export async function insert({ userId, tokenHash, expiresAt }) {
  const { rows } = await query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [userId, tokenHash, expiresAt],
  );
  return String(rows[0].id);
}

/**
 * Kode aktif milik SATU pengguna.
 *
 * Pencarian diikat ke `user_id`, bukan hanya ke hash. Kode enam digit punya
 * sejuta kemungkinan; mencarinya lewat hash saja berarti satu tebakan yang
 * cocok membuka reset milik pengguna MANA SAJA yang sedang aktif — penyerang
 * tidak perlu menargetkan siapa pun, dan peluangnya membesar seiring jumlah
 * pengguna yang sedang mereset.
 */
export async function findActiveForUser(userId) {
  const { rows } = await query(
    `SELECT id, user_id, token_hash, attempts
       FROM password_reset_tokens
      WHERE user_id = $1
        AND used_at IS NULL
        AND expires_at > NOW()
      ORDER BY id DESC
      LIMIT 1`,
    [userId],
  );
  if (!rows[0]) return null;
  return {
    id: String(rows[0].id),
    userId: String(rows[0].user_id),
    tokenHash: rows[0].token_hash,
    attempts: Number(rows[0].attempts),
  };
}

/**
 * Mencatat satu tebakan salah, dan membakar kode saat batasnya tercapai.
 *
 * Dilakukan dalam satu pernyataan agar dua tebakan yang datang bersamaan tidak
 * saling menimpa hitungannya dan lolos melewati batas.
 */
export async function registerFailedAttempt(id, maxAttempts) {
  const { rows } = await query(
    `UPDATE password_reset_tokens
        SET attempts = attempts + 1,
            used_at  = CASE WHEN attempts + 1 >= $2 THEN NOW() ELSE used_at END
      WHERE id = $1
      RETURNING attempts, used_at`,
    [id, maxAttempts],
  );
  const row = rows[0];
  return { attempts: Number(row?.attempts ?? 0), burned: Boolean(row?.used_at) };
}

/**
 * Mengonsumsi kode secara atomik.
 *
 * `used_at IS NULL` dan pemeriksaan expiry berada di UPDATE, bukan hanya pada
 * SELECT sebelumnya. Dua request bersamaan akan dikunci PostgreSQL; hanya satu
 * yang memperoleh rowCount 1 dan request lainnya dibatalkan.
 */
export async function consume(id, userId, client) {
  const run = client ? client.query.bind(client) : query;
  const { rowCount } = await run(
    `UPDATE password_reset_tokens
        SET used_at = NOW()
      WHERE id = $1
        AND user_id = $2
        AND used_at IS NULL
        AND expires_at > NOW()`,
    [id, userId],
  );
  return rowCount === 1;
}

/**
 * Membatalkan kode yang belum terpakai milik pengguna.
 *
 * Dipanggil sebelum menerbitkan kode baru, sehingga hanya ada satu kode yang
 * berlaku pada satu waktu. Tanpa ini, seluruh kode dari setiap permintaan
 * tetap sah dan memperbesar jendela serangan.
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
