#!/usr/bin/env node

import fs from "node:fs/promises";
import { closePool, query } from "../src/config/database.js";

const migration = new URL("../src/database/migrate.sql", import.meta.url);

try {
  const sql = await fs.readFile(migration, "utf8");
  await query(sql);
  console.log("[db] Migrasi idempoten selesai.");
} catch (error) {
  console.error(`[db] Migrasi gagal: ${error.message}`);
  process.exitCode = 1;
} finally {
  await closePool();
}
