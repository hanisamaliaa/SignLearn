#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { v2 as cloudinary } from "cloudinary";
import app from "../src/app.js";
import { closePool, query } from "../src/config/database.js";
import { env } from "../src/config/env.js";
import * as userRepository from "../src/repositories/userRepository.js";
import { hashPassword } from "../src/services/authService.js";
import { destroyImageBestEffort } from "../src/services/cloudinaryService.js";

const ROOT = new URL("../../", import.meta.url);
const PNG_PATH = new URL("frontend/src/assets/avatars/avatar-1.png", ROOT);
const WEBP_A_PATH = new URL("frontend/src/assets/bisindo/a.webp", ROOT);
const WEBP_B_PATH = new URL("frontend/src/assets/bisindo/b.webp", ROOT);

const stamp = `${Date.now()}-${randomUUID().slice(0, 8)}`;
const suffix = randomUUID().replace(/[^a-f]/g, "").slice(0, 8);
const adminEmail = `cloudinary-admin-${stamp}@signlearn.test`;
const userEmail = `cloudinary-user-${stamp}@signlearn.test`;
const password = "Langit#Uji2026";

let server;
let baseUrl;
let adminToken;
let userToken;
let courseId;
let translationId;
const createdPublicIds = new Set();

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

async function imageForm(path, mime, filename) {
  const bytes = await fs.readFile(path);
  const form = new FormData();
  form.append("image", new Blob([bytes], { type: mime }), filename);
  return form;
}

async function assertCdnImage(url, label) {
  const response = await fetch(url);
  check(`${label} dapat dibuka dari CDN`, response.ok, `${response.status}`);
  check(
    `${label} memiliki Content-Type gambar`,
    response.headers.get("content-type")?.startsWith("image/"),
    response.headers.get("content-type") || "tanpa Content-Type",
  );
  await response.arrayBuffer();
}

async function cloudinaryResourceExists(publicId) {
  try {
    await cloudinary.api.resource(publicId, { resource_type: "image", type: "upload" });
    return true;
  } catch (error) {
    const status = error?.http_code ?? error?.error?.http_code;
    if (status === 404) return false;
    throw error;
  }
}

async function waitUntilDeleted(publicId) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    if (!await cloudinaryResourceExists(publicId)) return true;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
}

async function readMedia(table, id, urlColumn, publicIdColumn) {
  const allowed = new Map([
    ["users", ["avatar", "avatar_public_id"]],
    ["courses", ["thumbnail", "thumbnail_public_id"]],
    ["translations", ["sign_image", "sign_image_public_id"]],
  ]);
  assert.deepEqual(allowed.get(table), [urlColumn, publicIdColumn]);
  const result = await query(
    `SELECT ${urlColumn} AS url, ${publicIdColumn} AS public_id FROM ${table} WHERE id = $1`,
    [id],
  );
  return result.rows[0];
}

async function startServer() {
  server = await new Promise((resolve, reject) => {
    const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
    instance.once("error", reject);
  });
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}${env.apiPrefix}`;
}

async function closeServer() {
  if (!server) return;
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  server = null;
}

async function cleanup() {
  for (const publicId of createdPublicIds) {
    await destroyImageBestEffort(publicId);
  }

  if (translationId) {
    await query("DELETE FROM translations WHERE id = $1", [translationId]).catch(() => {});
  }
  if (courseId) {
    await query("DELETE FROM courses WHERE id = $1", [courseId]).catch(() => {});
  }
  await query(
    "DELETE FROM users WHERE email = ANY($1::text[])",
    [[adminEmail, userEmail]],
  ).catch(() => {});
}

async function main() {
  console.log("\nSignLearn — real Cloudinary smoke test");
  check("kredensial Cloudinary lengkap", env.cloudinary.enabled);

  const admin = await userRepository.create({
    name: "Cloudinary Smoke Admin",
    email: adminEmail,
    passwordHash: await hashPassword(password),
    profile: "general",
    role: "admin",
  });
  check("admin sementara dibuat", Boolean(admin.id));

  await startServer();

  const adminLogin = await call("/auth/login", {
    method: "POST",
    body: { email: adminEmail, password },
  });
  check("admin dapat login", adminLogin.response.status === 200, `${adminLogin.response.status}`);
  adminToken = adminLogin.data.accessToken;

  const user = await userRepository.create({
    name: "Cloudinary Smoke User",
    email: userEmail,
    passwordHash: await hashPassword(password),
    profile: "general",
    role: "user",
  });
  await userRepository.markEmailVerified(user.id);
  const userLogin = await call("/auth/login", {
    method: "POST",
    body: { email: userEmail, password },
  });
  check("user terverifikasi dapat login", userLogin.response.status === 200, `${userLogin.response.status}`);
  userToken = userLogin.data.accessToken;
  const userId = user.id;

  console.log("\n  Foto profil");
  const firstAvatar = await call("/users/profile/avatar", {
    method: "POST",
    token: userToken,
    form: await imageForm(PNG_PATH, "image/png", "avatar-smoke.png"),
  });
  check("upload avatar PNG berhasil", firstAvatar.response.status === 200, `${firstAvatar.response.status}`);
  const firstAvatarMedia = await readMedia("users", userId, "avatar", "avatar_public_id");
  createdPublicIds.add(firstAvatarMedia.public_id);
  check("URL dan public ID avatar tersimpan", Boolean(firstAvatarMedia.url && firstAvatarMedia.public_id));
  check("URL avatar memakai HTTPS", firstAvatarMedia.url.startsWith("https://"));
  await assertCdnImage(firstAvatarMedia.url, "avatar PNG");

  const secondAvatar = await call("/users/profile/avatar", {
    method: "POST",
    token: userToken,
    form: await imageForm(WEBP_A_PATH, "image/webp", "avatar-replacement.webp"),
  });
  check("penggantian avatar WebP berhasil", secondAvatar.response.status === 200, `${secondAvatar.response.status}`);
  const secondAvatarMedia = await readMedia("users", userId, "avatar", "avatar_public_id");
  createdPublicIds.add(secondAvatarMedia.public_id);
  check("public ID berubah saat avatar diganti", secondAvatarMedia.public_id !== firstAvatarMedia.public_id);
  check("aset avatar lama terhapus", await waitUntilDeleted(firstAvatarMedia.public_id));
  await assertCdnImage(secondAvatarMedia.url, "avatar WebP");

  const profile = await call("/users/profile", { token: userToken });
  check("GET profil mengembalikan URL Cloudinary", profile.data.user.avatar === secondAvatarMedia.url);

  console.log("\n  Thumbnail kursus");
  const course = await call("/courses", {
    method: "POST",
    token: adminToken,
    body: { title: `Cloudinary Smoke ${suffix}`, level: "Pemula" },
  });
  check("kursus sementara dibuat", course.response.status === 201, `${course.response.status}`);
  courseId = course.data.course.id;

  const courseUpload = await call(`/courses/${courseId}/thumbnail`, {
    method: "POST",
    token: adminToken,
    form: await imageForm(PNG_PATH, "image/png", "course-thumbnail.png"),
  });
  check("upload thumbnail kursus berhasil", courseUpload.response.status === 200, `${courseUpload.response.status}`);
  const courseMedia = await readMedia("courses", courseId, "thumbnail", "thumbnail_public_id");
  createdPublicIds.add(courseMedia.public_id);
  check("URL dan public ID thumbnail tersimpan", Boolean(courseMedia.url && courseMedia.public_id));
  await assertCdnImage(courseMedia.url, "thumbnail kursus");

  console.log("\n  Gambar bank kata");
  const translation = await call("/translations", {
    method: "POST",
    token: adminToken,
    body: {
      word: `Uji Media ${suffix}`,
      translation: "U-J-I M-E-D-I-A",
      category: "Uji",
      status: "active",
      signVideo: "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
      aliases: [],
    },
  });
  check("kata sementara dibuat", translation.response.status === 201, `${translation.response.status}`);
  translationId = translation.data.translation.id;

  const translationUpload = await call(`/translations/${translationId}/image`, {
    method: "POST",
    token: adminToken,
    form: await imageForm(WEBP_B_PATH, "image/webp", "word-bank.webp"),
  });
  check("upload gambar bank kata berhasil", translationUpload.response.status === 200, `${translationUpload.response.status}`);
  const translationMedia = await readMedia(
    "translations",
    translationId,
    "sign_image",
    "sign_image_public_id",
  );
  createdPublicIds.add(translationMedia.public_id);
  check("URL dan public ID bank kata tersimpan", Boolean(translationMedia.url && translationMedia.public_id));
  await assertCdnImage(translationMedia.url, "gambar bank kata");

  const learnerWord = await call(`/translations/${translationId}`, {
    token: userToken,
  });
  check("kata aktif dapat dibaca dari dashboard pengguna", learnerWord.response.status === 200);
  check(
    "dashboard pengguna menerima gambar dan video bank kata",
    learnerWord.data?.translation?.signImage === translationMedia.url &&
      learnerWord.data?.translation?.signVideo === "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
  );

  const learnerList = await call(`/translations?q=${encodeURIComponent(`Uji Media ${suffix}`)}`, {
    token: userToken,
  });
  const listedWord = learnerList.data?.items?.find((item) => item.id === String(translationId));
  check(
    "daftar kamus pengguna mempertahankan kedua media",
    listedWord?.signImage === translationMedia.url && Boolean(listedWord?.signVideo),
  );

  console.log("\n  Cleanup lifecycle");
  const clearAvatar = await call("/users/profile", {
    method: "PUT",
    token: userToken,
    body: { avatar: "luna" },
  });
  check("avatar dapat dikembalikan ke bawaan", clearAvatar.response.status === 200);
  check("aset avatar Cloudinary terhapus", await waitUntilDeleted(secondAvatarMedia.public_id));

  const removeCourse = await call(`/courses/${courseId}`, {
    method: "DELETE",
    token: adminToken,
  });
  check("kursus sementara dihapus", removeCourse.response.status === 200);
  check("aset thumbnail ikut terhapus", await waitUntilDeleted(courseMedia.public_id));
  courseId = null;

  const removeTranslation = await call(`/translations/${translationId}`, {
    method: "DELETE",
    token: adminToken,
  });
  check("kata sementara dihapus", removeTranslation.response.status === 200);
  check("aset bank kata ikut terhapus", await waitUntilDeleted(translationMedia.public_id));
  translationId = null;

  console.log("\n  PASS — seluruh upload Cloudinary nyata dan cleanup lifecycle berhasil.\n");
}

main()
  .catch((error) => {
    console.error(`\n  FAIL — ${error.stack || error.message}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeServer().catch(() => {});
    await cleanup();
    await closePool();
  });
