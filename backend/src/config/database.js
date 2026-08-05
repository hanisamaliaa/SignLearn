import pg from "pg";
import { env } from "./env.js";

const { Pool } = pg;

const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: {
    rejectUnauthorized: false,
  },
});

export async function testConnection() {
  try {
    const client = await pool.connect();
    await client.query("SELECT NOW()");
    client.release();

    return {
      ok: true,
      message: "Database connected successfully",
    };
  } catch (err) {
    return {
      ok: false,
      message: err.message,
    };
  }
}

export default pool;
