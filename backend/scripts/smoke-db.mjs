#!/usr/bin/env node
/**
 * Test tingkat repository — sifat yang TIDAK dapat diuji lewat HTTP.
 *
 *   npm run smoke:db
 *
 * ⚠ Menulis langsung ke database yang ditunjuk DATABASE_URL. Jalankan hanya
 *   pada database pengembangan atau throwaway, jangan pada produksi.
 *
 * ── Kenapa berkas terpisah ────────────────────────────────────────────
 *
 * Sebagian jaminan hidup di bawah permukaan API. Cakupan transaksi salah satunya:
 * dari luar, `POST /auth/reset-password` terlihat berhasil baik ketika
 * transaksinya benar maupun ketika ia bocor. Bedanya baru terlihat saat
 * langkah kedua gagal — keadaan yang tidak dapat dipicu lewat HTTP.
 */

import crypto from "node:crypto";
import { withTransaction, query, closePool } from "../src/config/database.js";
import * as userRepo from "../src/repositories/userRepository.js";
import * as resetRepo from "../src/repositories/passwordResetRepository.js";
import * as authService from "../src/services/authService.js";
import { hashResetCode } from "../src/utils/crypto.js";
import { check, summary, c } from "./lib/harness.mjs";

async function createThrowawayUser() {
  const email = `dbtest+${Date.now()}${crypto.randomInt(1000)}@signlearn.test`;
  const user = await userRepo.create({
    name: "Uji Repository",
    email,
    passwordHash: "$2a$04$originalhashoriginalhashoriginalhashoriginalhashoriginal",
    profile: "general",
    role: "user",
  });
  return user;
}

async function readHash(userId) {
  const { rows } = await query(`SELECT password_hash FROM users WHERE id = $1`, [userId]);
  return rows[0]?.password_hash ?? null;
}

async function main() {
  console.log(`\n${c.b("SignLearn — smoke test repository & transaksi")}`);

  console.log(c.b("\n  Skema media Cloudinary"));
  const mediaColumns = await query(`
    SELECT table_name, column_name, character_maximum_length
      FROM information_schema.columns
     WHERE (table_name, column_name) IN (
       ('users', 'avatar'),
       ('users', 'avatar_public_id'),
       ('courses', 'thumbnail_public_id'),
       ('translations', 'sign_image_public_id')
     )
  `);
  const byColumn = new Map(
    mediaColumns.rows.map((row) => [`${row.table_name}.${row.column_name}`, row]),
  );
  check("kolom public ID tersedia untuk seluruh jenis upload", [
    "users.avatar_public_id",
    "courses.thumbnail_public_id",
    "translations.sign_image_public_id",
  ].every((key) => byColumn.has(key)));
  check(
    "kolom avatar cukup panjang untuk URL Cloudinary",
    byColumn.get("users.avatar")?.character_maximum_length === 500,
  );

  const user = await createThrowawayUser();
  const originalHash = await readHash(user.id);

  console.log(c.b("\n  Cakupan transaksi — userRepository.updatePassword"));

  /**
   * Inti pengujian.
   *
   * `authService.resetPassword` membungkus `updatePassword` dan `consume`
   * dalam satu `withTransaction`. Bila `updatePassword` mengabaikan `client`
   * yang diberikan, ia berjalan pada koneksi LAIN dari pool — di luar
   * transaksi. Akibatnya ROLLBACK tidak membatalkan perubahan kata sandi,
   * dan pengguna berakhir dengan kata sandi baru sekaligus token reset yang
   * masih dapat dipakai ulang.
   */
  await withTransaction(async (client) => {
    await userRepo.updatePassword(user.id, "$2a$04$ROLLBACKME", client);

    const inside = await client.query(
      `SELECT password_hash FROM users WHERE id = $1`,
      [user.id],
    );
    check("perubahan terlihat DI DALAM transaksi",
      inside.rows[0].password_hash === "$2a$04$ROLLBACKME",
      inside.rows[0].password_hash?.slice(0, 20));

    // Melempar memaksa `withTransaction` melakukan ROLLBACK.
    const abort = new Error("SENGAJA_DIBATALKAN");
    abort.expected = true;
    throw abort;
  }).catch((err) => {
    if (!err.expected) throw err;
  });

  const afterRollback = await readHash(user.id);
  check("ROLLBACK benar-benar membatalkan perubahan kata sandi",
    afterRollback === originalHash,
    afterRollback === originalHash ? "" : `masih ${afterRollback?.slice(0, 20)}`);

  // Tanpa client, fungsi yang sama harus tetap bekerja seperti biasa —
  // parameternya opsional, bukan wajib.
  await userRepo.updatePassword(user.id, "$2a$04$TANPACLIENT");
  check("tanpa client tetap menulis seperti biasa",
    (await readHash(user.id)) === "$2a$04$TANPACLIENT");

  console.log(c.b("\n  Efek samping updatePassword"));

  await query(
    `UPDATE users SET failed_login_attempts = 4, locked_until = NOW() + INTERVAL '10 minutes'
      WHERE id = $1`,
    [user.id],
  );
  await userRepo.updatePassword(user.id, "$2a$04$SETELAHRESET");

  const { rows } = await query(
    `SELECT failed_login_attempts, locked_until FROM users WHERE id = $1`,
    [user.id],
  );
  // Mengganti kata sandi harus membuka kunci akun. Tanpa ini, pengguna yang
  // mereset kata sandi justru masih terkunci dan tidak paham kenapa.
  check("penghitung gagal login direset", rows[0].failed_login_attempts === 0,
    `${rows[0].failed_login_attempts}`);
  check("penguncian akun dibuka", rows[0].locked_until === null);

  // Bersih-bersih: baris uji tidak boleh menumpuk di database pengembangan.
  await query(`DELETE FROM users WHERE id = $1`, [user.id]);

  console.log(c.b("\n  Alur reset kata sandi — database nyata"));

  const resetEmail = `reset-dbtest+${Date.now()}${crypto.randomInt(1000)}@signlearn.test`;
  const oldPassword = "Lama#Aman2026";
  const newPassword = "Baru#Aman2027";
  const resetCode = "482917";
  let resetUser;

  try {
    resetUser = await userRepo.create({
      name: "Uji Reset Password",
      email: resetEmail,
      passwordHash: await authService.hashPassword(oldPassword),
      profile: "general",
      role: "user",
    });
    await authService.login({ email: resetEmail, password: oldPassword });

    const beforeReset = await userRepo.findByEmailWithSecret(resetEmail);
    const resetId = await resetRepo.insert({
      userId: resetUser.id,
      tokenHash: hashResetCode(resetUser.id, resetCode),
      expiresAt: new Date(Date.now() + 15 * 60_000),
    });

    await authService.resetPassword({
      email: resetEmail,
      code: resetCode,
      password: newPassword,
    });

    const afterReset = await userRepo.findByEmailWithSecret(resetEmail);
    check("hash kata sandi benar-benar berubah di users",
      beforeReset.passwordHash !== afterReset.passwordHash);
    check("hash baru cocok dengan kata sandi baru",
      await authService.verifyPassword(newPassword, afterReset.passwordHash));

    const resetState = await query(
      `SELECT used_at FROM password_reset_tokens WHERE id = $1`,
      [resetId],
    );
    check("kode reset ditandai sudah digunakan", Boolean(resetState.rows[0]?.used_at));

    const oldSessions = await query(
      `SELECT COUNT(*)::int AS count
         FROM refresh_tokens
        WHERE user_id = $1 AND revoked_at IS NULL`,
      [resetUser.id],
    );
    check("seluruh sesi lama dicabut dalam transaksi",
      oldSessions.rows[0].count === 0,
      `${oldSessions.rows[0].count} sesi masih aktif`);

    let replayRejected = false;
    try {
      await authService.resetPassword({
        email: resetEmail,
        code: resetCode,
        password: "Replay#Ditolak2028",
      });
    } catch {
      replayRejected = true;
    }
    check("kode yang sama tidak dapat dipakai ulang", replayRejected);

    let oldPasswordRejected = false;
    try {
      await authService.login({ email: resetEmail, password: oldPassword });
    } catch {
      oldPasswordRejected = true;
    }
    check("kata sandi lama ditolak", oldPasswordRejected);

    const newLogin = await authService.login({ email: resetEmail, password: newPassword });
    check("login dengan kata sandi baru berhasil", newLogin.user.email === resetEmail);
  } finally {
    if (resetUser) await query(`DELETE FROM users WHERE id = $1`, [resetUser.id]);
  }

  const ok = summary("repository & transaksi");
  await closePool();
  process.exitCode = ok ? 0 : 1;
}

main().catch(async (err) => {
  console.error(`\n  ${c.no("Test berhenti:")} ${err.message}\n`);
  await closePool().catch(() => {});
  process.exitCode = 1;
});
