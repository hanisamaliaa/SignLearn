#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import app from "../src/app.js";
import { closePool, query } from "../src/config/database.js";
import { env } from "../src/config/env.js";
import * as userRepository from "../src/repositories/userRepository.js";
import { hashPassword } from "../src/services/authService.js";

const ROOT = new URL("../../", import.meta.url);
const IMAGE_PATH = new URL("frontend/src/assets/bisindo/b.webp", ROOT);
const VIDEO_URL = "https://www.youtube.com/watch?v=Hx8IU6CfMIM";
const WORD = "B";
const PASSWORD = "Media#Bank2026";
const stamp = `${Date.now()}-${randomUUID().slice(0, 8)}`;
const adminEmail = `wordbank-admin-${stamp}@signlearn.test`;
const learnerEmail = `wordbank-learner-${stamp}@signlearn.test`;

let server;
let baseUrl;

function check(label, condition, detail = "") {
  assert.ok(condition, `${label}${detail ? `: ${detail}` : ""}`);
  console.log(`  PASS  ${label}${detail ? ` (${detail})` : ""}`);
}

async function call(path, { method = "GET", token, body, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
  });
  const payload = await response.json().catch(() => null);
  return { response, payload, data: payload?.data };
}

async function login(email) {
  const result = await call("/auth/login", {
    method: "POST",
    body: { email, password: PASSWORD },
  });
  check(`${email.split("@")[0]} dapat login`, result.response.status === 200, `${result.response.status}`);
  return result.data.accessToken;
}

async function startServer() {
  server = await new Promise((resolve, reject) => {
    const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
    instance.once("error", reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}${env.apiPrefix}`;
}

async function closeServer() {
  if (!server) return;
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  server = null;
}

async function cleanupUsers() {
  await query("DELETE FROM users WHERE email = ANY($1::text[])", [[adminEmail, learnerEmail]]).catch(() => {});
}

async function main() {
  console.log("\nSignLearn — seed media Bank Kata melalui API admin");
  check("konfigurasi Cloudinary aktif", env.cloudinary.enabled);

  const passwordHash = await hashPassword(PASSWORD);
  const admin = await userRepository.create({
    name: "Word Bank Seed Admin",
    email: adminEmail,
    passwordHash,
    profile: "general",
    role: "admin",
  });
  const learner = await userRepository.create({
    name: "Word Bank Seed Learner",
    email: learnerEmail,
    passwordHash,
    profile: "general",
    role: "user",
  });
  await userRepository.markEmailVerified(learner.id);

  await startServer();
  const adminToken = await login(adminEmail);
  const learnerToken = await login(learnerEmail);

  const metadata = {
    word: WORD,
    translation: WORD,
    description: "Bentuk tangan huruf B berdasarkan kartu alfabet BISINDO SignLearn. Video memperagakan abjad A–Z varian Yogyakarta; variasi isyarat antardaerah dapat berbeda.",
    category: "Abjad",
    status: "active",
    signVideo: VIDEO_URL,
    aliases: ["huruf b", "abjad b"],
  };

  const existing = await call(`/translations?q=${encodeURIComponent(WORD)}&limit=100`, {
    token: adminToken,
  });
  check("admin dapat mencari entri alfabet", existing.response.status === 200);
  let entry = existing.data?.items?.find((item) => item.word.toUpperCase() === WORD);

  if (entry) {
    const updated = await call(`/translations/${entry.id}`, {
      method: "PUT",
      token: adminToken,
      body: metadata,
    });
    check("metadata entri B diperbarui melalui API admin", updated.response.status === 200, `${updated.response.status}`);
    entry = updated.data.translation;
  } else {
    const created = await call("/translations", {
      method: "POST",
      token: adminToken,
      body: metadata,
    });
    check("entri B dibuat melalui API admin", created.response.status === 201, `${created.response.status}`);
    entry = created.data.translation;
  }

  const imageBytes = await fs.readFile(IMAGE_PATH);
  const form = new FormData();
  form.append("image", new Blob([imageBytes], { type: "image/webp" }), "bisindo-b.webp");
  const uploaded = await call(`/translations/${entry.id}/image`, {
    method: "POST",
    token: adminToken,
    form,
  });
  check("gambar B diunggah melalui API admin", uploaded.response.status === 200, `${uploaded.response.status}`);
  entry = uploaded.data.translation;

  check("gambar Cloudinary tersimpan dengan HTTPS", /^https:\/\//.test(entry.signImage));
  check("video alfabet tersimpan", entry.signVideo === VIDEO_URL);
  const imageResponse = await fetch(entry.signImage);
  check("gambar dapat dibuka dari CDN", imageResponse.ok, `${imageResponse.status}`);
  check("CDN mengirim Content-Type gambar", imageResponse.headers.get("content-type")?.startsWith("image/"));
  await imageResponse.arrayBuffer();

  const oembed = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(VIDEO_URL)}&format=json`);
  check("video YouTube masih tersedia", oembed.ok, `${oembed.status}`);
  const videoMetadata = await oembed.json();
  check("metadata video menyebut abjad BISINDO", /BISINDO.*ABJAD|ABJAD.*BISINDO/i.test(videoMetadata.title), videoMetadata.title);
  check("metadata video menyebut varian Yogyakarta", /YOGYAKARTA/i.test(videoMetadata.title), videoMetadata.title);

  const detail = await call(`/translations/${entry.id}`, { token: learnerToken });
  check("entri dapat dibaca sebagai pengguna dashboard", detail.response.status === 200, `${detail.response.status}`);
  check(
    "detail pengguna menerima gambar dan video",
    detail.data?.translation?.signImage === entry.signImage && detail.data?.translation?.signVideo === VIDEO_URL,
  );
  const listing = await call(`/translations?q=${encodeURIComponent(WORD)}&limit=100`, { token: learnerToken });
  const listed = listing.data?.items?.find((item) => item.id === String(entry.id));
  check("kartu kamus pengguna memuat kedua media", Boolean(listed?.signImage && listed?.signVideo));

  console.log(`\n  READY  Entri ${WORD} tersedia di dashboard pengguna (ID ${entry.id}).`);
  console.log(`  IMAGE  ${entry.signImage}`);
  console.log(`  VIDEO  ${entry.signVideo}\n`);
}

main()
  .catch((error) => {
    console.error(`\n  FAIL  ${error.stack || error.message}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeServer().catch(() => {});
    await cleanupUsers();
    await closePool();
  });
