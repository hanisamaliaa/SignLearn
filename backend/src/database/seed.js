/**
 * Seed script — placeholder. When the DB is ready, run `npm run seed`.
 * This file currently only documents the intent and does not write data.
 */
import bcrypt from "bcryptjs";
import { env } from "../config/env.js";

async function seed() {
  console.log("[seed] Starting (placeholder — nothing written).");

  const adminHash = await bcrypt.hash("admin123", env.bcryptRounds);
  console.log(
    `[seed] Would insert admin user with hash: ${adminHash.slice(0, 20)}...`,
  );

  console.log(
    "[seed] Done. Implement queries in this file once the DB is wired.",
  );
}

seed().catch((err) => {
  console.error("[seed] Failed:", err);
  process.exit(1);
});
