#!/usr/bin/env node
/**
 * Menjalankan SELURUH smoke suite berurutan.
 *
 *   npm run smoke:all
 *
 * Dipakai sebelum menandai pekerjaan selesai, sebelum demo, dan setelah ganti
 * DATABASE_URL. Menjawab satu pertanyaan: "apakah backend ini benar-benar
 * bekerja di lingkungan ini?"
 *
 * ── Prasyarat ─────────────────────────────────────────────────────────
 *
 *   1. Server berjalan          (npm run dev)
 *   2. Database sudah di-seed   (npm run seed)
 *
 * Bila kredensial admin seed tidak tersedia, runner membuat admin sementara
 * yang hanya hidup selama suite. Secret pengujian tidak ditanam di repo.
 *
 * ── Kenapa NODE_ENV=test disarankan untuk server ──────────────────────
 *
 * Rate limiter register dibatasi 3 pendaftaran per JAM per IP. Suite ini
 * membuat lebih dari itu, jadi dijalankan pada server biasa ia akan berhenti
 * di tengah dengan 429 — kegagalan yang terlihat seperti bug padahal justru
 * bukti limiternya bekerja. `NODE_ENV=test` mematikan seluruh limiter
 * (lihat `rateLimit.middleware.js`).
 */

import { spawn } from "node:child_process";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { closePool, query } from "../src/config/database.js";
import * as userRepository from "../src/repositories/userRepository.js";
import { hashPassword } from "../src/services/authService.js";

const here = dirname(fileURLToPath(import.meta.url));

const SUITES = [
  ["Autentikasi", "smoke-auth.mjs"],
  ["Checkout Premium", "smoke-subscription.mjs"],
  ["Users & profil", "smoke-users.mjs"],
  ["Konten & progres", "smoke-content.mjs"],
  ["Dashboard & admin", "smoke-dashboard.mjs"],
  ["Bank Kata & Kamus", "smoke-wordbank.mjs"],
  ["Repository & transaksi", "smoke-db.mjs"],
];

const c = {
  ok: (s) => `\x1b[32m${s}\x1b[0m`,
  no: (s) => `\x1b[31m${s}\x1b[0m`,
  b: (s) => `\x1b[1m${s}\x1b[0m`,
  dim: (s) => `\x1b[90m${s}\x1b[0m`,
};

function run(file) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [join(here, file)], {
      stdio: "inherit",
      env: process.env,
    });
    child.on("close", (code) => resolve(code === 0));
  });
}

const results = [];
let temporaryAdminId = null;

try {
  if (!process.env.SEED_ADMIN_PASSWORD) {
    const suffix = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
    const password = `Smoke#Admin9-${crypto.randomBytes(8).toString("hex")}`;
    const admin = await userRepository.create({
      name: "Smoke Suite Admin",
      email: `smoke-admin-${suffix}@signlearn.test`,
      passwordHash: await hashPassword(password),
      profile: "general",
      role: "admin",
    });
    await userRepository.markEmailVerified(admin.id);
    temporaryAdminId = admin.id;
    process.env.SEED_ADMIN_EMAIL = admin.email;
    process.env.SEED_ADMIN_PASSWORD = password;
    console.log(c.dim("\n  Admin sementara dibuat untuk smoke suite."));
  }

  // Berurutan, bukan paralel: seluruh suite berbagi satu database, dan yang
  // berjalan bersamaan akan saling mengubah angka yang sedang diperiksa.
  for (const [label, file] of SUITES) {
    results.push([label, await run(file)]);
  }

  console.log(c.b("\n═══ Hasil seluruh suite ═══\n"));
  for (const [label, ok] of results) {
    console.log(`  ${ok ? c.ok("LULUS") : c.no("GAGAL")}  ${label}`);
  }

  const failed = results.filter(([, ok]) => !ok).length;
  console.log(
    failed
      ? c.no(`\n  ${failed} dari ${results.length} suite gagal.\n`)
      : c.ok(`\n  Seluruh ${results.length} suite lulus.\n`),
  );
  process.exitCode = failed ? 1 : 0;
} finally {
  if (temporaryAdminId) {
    await query("DELETE FROM users WHERE id=$1", [temporaryAdminId]).catch(() => {});
  }
  await closePool();
}
