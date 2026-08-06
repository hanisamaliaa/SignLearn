import pg from "pg";
import { env } from "./env.js";

const { Pool, types } = pg;

/**
 * Connection pool PostgreSQL (Supabase).
 *
 * Repository memakai `query()` dan `withTransaction()` dari sini; tidak ada
 * lapisan lain yang boleh menyentuh `pool` secara langsung.
 */

/**
 * BIGINT (OID 20) dikembalikan pg sebagai STRING secara default, dan itu
 * memang yang kita inginkan — `Number.MAX_SAFE_INTEGER` lebih kecil dari
 * jangkauan BIGINT, sehingga konversi ke number akan membulatkan diam-diam
 * dan dua baris berbeda bisa berakhir dengan id yang sama.
 *
 * Parser dipasang eksplisit agar perilaku ini tidak berubah bila ada yang
 * memasang library yang mengubah default global pg.
 */
types.setTypeParser(20, (value) => value);

// NUMERIC (OID 1700) juga string secara default agar presisi desimal terjaga.
// Untuk estimated_hours kita justru ingin number, jadi dikonversi di repository.

const pool = new Pool({
  connectionString: env.database.url,
  max: env.database.poolMax,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  ssl: env.database.ssl
    ? { rejectUnauthorized: env.database.sslRejectUnauthorized }
    : false,
});

pool.on("error", (err) => {
  // Klien idle yang error tidak boleh menjatuhkan proses.
  console.error("[db] idle client error:", err.message);
});

/**
 * Jalankan satu query.
 * @param {string} text SQL berparameter — JANGAN pernah interpolasi string
 * @param {Array} params
 */
export function query(text, params) {
  return pool.query(text, params);
}

/**
 * Jalankan fn di dalam satu transaksi. Commit bila sukses, rollback bila melempar.
 *
 * Dipakai untuk operasi yang harus atomik — mis. mencabut token lama dan
 * menerbitkan token baru saat refresh. Bila salah satunya gagal sendirian,
 * pengguna berakhir tanpa sesi sama sekali atau dengan dua sesi aktif.
 */
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function testConnection() {
  try {
    const { rows } = await pool.query("SELECT NOW() AS now");
    return { ok: true, message: `Terhubung ke PostgreSQL (${rows[0].now.toISOString()})` };
  } catch (err) {
    return { ok: false, message: err.message };
  }
}

export async function closePool() {
  await pool.end();
}

export default pool;
