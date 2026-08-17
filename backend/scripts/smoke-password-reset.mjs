#!/usr/bin/env node

import crypto from "node:crypto";
import { once } from "node:events";
import app from "../src/app.js";
import { closePool, query } from "../src/config/database.js";
import * as authService from "../src/services/authService.js";
import * as resetRepo from "../src/repositories/passwordResetRepository.js";
import * as userRepo from "../src/repositories/userRepository.js";
import { hashResetCode } from "../src/utils/crypto.js";
import { check, summary, c } from "./lib/harness.mjs";

const OLD_PASSWORD = "Lama#Http2026";
const NEW_PASSWORD = "Baru#Http2027";
const RESET_CODE = "593821";

async function request(baseUrl, path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await response.json();
  return { response, json };
}

async function main() {
  console.log(`\n${c.b("SignLearn — smoke test reset password via HTTP")}`);

  const email = `reset-http+${Date.now()}-${crypto.randomInt(1000)}@signlearn.test`;
  let user;
  let server;

  try {
    user = await userRepo.create({
      name: "Reset HTTP",
      email,
      passwordHash: await authService.hashPassword(OLD_PASSWORD),
      profile: "general",
      role: "user",
    });
    await resetRepo.insert({
      userId: user.id,
      tokenHash: hashResetCode(user.id, RESET_CODE),
      expiresAt: new Date(Date.now() + 15 * 60_000),
    });

    server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    const { port } = server.address();
    const baseUrl = `http://127.0.0.1:${port}/api/v1`;

    const forgot = await request(baseUrl, "/auth/forgot-password", {
      email: "nonexistent-reset-check@signlearn.test",
    });
    check("forgot-password tidak pernah membocorkan kode ke frontend",
      forgot.response.status === 200 && forgot.json.data === null &&
        !Object.hasOwn(forgot.json, "devCode") && !JSON.stringify(forgot.json).includes("devCode"));

    const reset = await request(baseUrl, "/auth/reset-password", {
      email,
      code: RESET_CODE,
      password: NEW_PASSWORD,
    });
    check("reset password via HTTP berhasil", reset.response.status === 200,
      `${reset.response.status} ${reset.json.code ?? ""}`);

    const oldLogin = await request(baseUrl, "/auth/login", {
      email,
      password: OLD_PASSWORD,
    });
    check("password lama ditolak via HTTP", oldLogin.response.status === 401,
      `${oldLogin.response.status}`);

    const newLogin = await request(baseUrl, "/auth/login", {
      email,
      password: NEW_PASSWORD,
    });
    check("password baru dapat login via HTTP",
      newLogin.response.status === 200 && Boolean(newLogin.json.data?.accessToken),
      `${newLogin.response.status}`);

    const replay = await request(baseUrl, "/auth/reset-password", {
      email,
      code: RESET_CODE,
      password: "Replay#Ditolak2028",
    });
    check("kode reset tidak dapat dipakai ulang via HTTP", replay.response.status === 401,
      `${replay.response.status}`);

    const stored = await userRepo.findByEmailWithSecret(email);
    check("database menyimpan hash password baru",
      await authService.verifyPassword(NEW_PASSWORD, stored.passwordHash));

    const ok = summary("reset password via HTTP");
    process.exitCode = ok ? 0 : 1;
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (user) await query(`DELETE FROM users WHERE id = $1`, [user.id]);
    await closePool();
  }
}

main().catch((error) => {
  console.error(`\n${c.no("Smoke test berhenti:")} ${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
