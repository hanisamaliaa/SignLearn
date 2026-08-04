import mysql from "mysql2/promise";
import { env } from "./env.js";

/**
 * MySQL connection pool.
 *
 * NOTE: This file only prepares the database layer. No tables are created
 * or queried here yet — the application can be booted without a live MySQL
 * server. Actual queries are added in the repositories layer once the DB
 * schema is finalized.
 */
const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  connectionLimit: env.db.connectionLimit,
  waitForConnections: true,
  queueLimit: 0,
  namedPlaceholders: true,
});

export async function testConnection() {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.ping();
    return { ok: true, message: "Database connection OK" };
  } catch (err) {
    return { ok: false, message: err.message };
  } finally {
    if (conn) conn.release();
  }
}

export default pool;
