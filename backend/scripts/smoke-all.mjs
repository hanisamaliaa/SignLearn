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
 *   3. SEED_ADMIN_PASSWORD ada di environment
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
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

const SUITES = [
  ["Autentikasi", "smoke-auth.mjs"],
  ["Users & profil", "smoke-users.mjs"],
  ["Konten & progres", "smoke-content.mjs"],
  ["Dashboard & admin", "smoke-dashboard.mjs"],
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

// Berurutan, bukan paralel: seluruh suite berbagi satu database, dan yang
// berjalan bersamaan akan saling mengubah angka yang sedang diperiksa
// suite lain.
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
