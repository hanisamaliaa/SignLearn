#!/usr/bin/env node
/**
 * Smoke test alur autentikasi.
 *
 *   npm run smoke                      # menguji http://localhost:4788
 *   API_URL=https://... npm run smoke  # menguji environment lain
 *
 * Menguji API yang BENAR-BENAR BERJALAN lewat HTTP — bukan unit test.
 * Menjawab satu pertanyaan: "apakah autentikasi bekerja di lingkungan ini?"
 *
 * Dipakai setelah deploy, setelah ganti DATABASE_URL, atau kapan pun ada
 * yang bertanya "apakah backend-nya sudah jalan?".
 */

import { closePool, query } from "../src/config/database.js";
import { env } from "../src/config/env.js";
import { hashEmailVerificationCode } from "../src/utils/crypto.js";

const BASE = (process.env.API_URL || "http://localhost:4788").replace(/\/$/, "");
const API = `${BASE}${process.env.API_PREFIX || "/api/v1"}`;

// Email unik per eksekusi agar tes berulang tidak bentrok.
const STAMP = Date.now();
const TEST_EMAIL = `smoke+${STAMP}@signlearn.test`;
const TEST_PASSWORD = "Kupu2#Terbang";

let passed = 0;
let failed = 0;

const c = {
  ok: (s) => `\x1b[32m${s}\x1b[0m`,
  no: (s) => `\x1b[31m${s}\x1b[0m`,
  dim: (s) => `\x1b[90m${s}\x1b[0m`,
  b: (s) => `\x1b[1m${s}\x1b[0m`,
};

function check(label, condition, detail = "") {
  if (condition) {
    passed++;
    console.log(`  ${c.ok("PASS")}  ${label}${detail ? c.dim("  " + detail) : ""}`);
  } else {
    failed++;
    console.log(`  ${c.no("FAIL")}  ${label}${detail ? c.dim("  " + detail) : ""}`);
  }
}

/**
 * Cookie jar sederhana.
 *
 * `fetch` bawaan Node tidak menyimpan cookie, sedangkan seluruh alur refresh
 * bergantung padanya. Tanpa ini, tes tidak akan pernah menyentuh jalur
 * HttpOnly yang justru paling ingin kita buktikan.
 */
class Jar {
  constructor() { this.cookies = new Map(); }

  absorb(response) {
    const raw = response.headers.getSetCookie?.() ?? [];
    for (const line of raw) {
      const [pair] = line.split(";");
      const idx = pair.indexOf("=");
      const name = pair.slice(0, idx).trim();
      const value = pair.slice(idx + 1).trim();
      if (value === "") this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
    return raw;
  }

  header() {
    return [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  clone() {
    const j = new Jar();
    j.cookies = new Map(this.cookies);
    return j;
  }
}

async function call(path, { method = "GET", body, token, jar } = {}) {
  const headers = {};
  if (body) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  if (jar?.cookies.size) headers.Cookie = jar.header();

  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const setCookie = jar ? jar.absorb(res) : [];
  let json = null;
  try { json = await res.json(); } catch { /* 204 dsb. */ }

  return { status: res.status, body: json, setCookie };
}

// ─────────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n${c.b("SignLearn — smoke test autentikasi")}`);
  console.log(c.dim(`  target : ${API}`));
  console.log(c.dim(`  akun   : ${TEST_EMAIL}\n`));

  // ── Health ────────────────────────────────────────────────────────────
  const health = await fetch(`${BASE}/api/health`).then((r) => r.json()).catch(() => null);
  check("server merespons", health?.status === "ok", health ? `env=${health.environment}` : "tidak dapat dihubungi");
  if (!health) {
    console.log(`\n  ${c.no("Server tidak dapat dihubungi.")} Jalankan 'npm run dev' lebih dulu.\n`);
    process.exit(1);
  }

  // ── Validasi kata sandi ───────────────────────────────────────────────
  console.log(c.b("\n  Kebijakan kata sandi"));
  const weak = await call("/auth/register", {
    method: "POST",
    body: { name: "Uji Lemah", email: `weak+${STAMP}@signlearn.test`, password: "11111111" },
  });
  check("kata sandi lemah ditolak", weak.status === 422, `${weak.status} ${weak.body?.code ?? ""}`);
  check("error dikembalikan per field", Array.isArray(weak.body?.errors) && weak.body.errors.length > 0,
    `${weak.body?.errors?.length ?? 0} pelanggaran`);

  // ── Register ──────────────────────────────────────────────────────────
  console.log(c.b("\n  Register"));
  const jar = new Jar();
  const reg = await call("/auth/register", {
    method: "POST",
    jar,
    body: { name: "Smoke Test", email: TEST_EMAIL, password: TEST_PASSWORD },
  });
  check("register berhasil", reg.status === 201, `${reg.status}`);
  check("verifikasi diwajibkan", reg.body?.data?.verificationRequired === true);
  check("email dinormalisasi", reg.body?.data?.email === TEST_EMAIL.toLowerCase());
  check("access token belum diterbitkan", !reg.body?.data?.accessToken);
  check("refreshToken TIDAK di body", !("refreshToken" in (reg.body?.data ?? {})));
  check("kode verifikasi tidak bocor ke frontend",
    !Object.keys(reg.body?.data ?? {}).some((k) => /code|token/i.test(k)));

  const cookieLine = reg.setCookie[0] ?? "";
  check("cookie sesi belum dipasang", cookieLine === "");

  const storedUser = await query(
    `SELECT id, email_verified_at FROM users WHERE LOWER(email)=LOWER($1) LIMIT 1`,
    [TEST_EMAIL],
  );
  const userId = storedUser.rows[0]?.id;
  check("akun tersimpan sebagai belum terverifikasi",
    Boolean(userId) && storedUser.rows[0].email_verified_at === null);

  const storedCode = await query(
    `SELECT id, token_hash, attempts, used_at
       FROM email_verification_tokens
      WHERE user_id=$1 ORDER BY id DESC LIMIT 1`,
    [userId],
  );
  check("kode hanya tersimpan sebagai HMAC SHA-256",
    /^[a-f0-9]{64}$/.test(storedCode.rows[0]?.token_hash ?? ""));

  const unverifiedLogin = await call("/auth/login", {
    method: "POST",
    body: { email: TEST_EMAIL, password: TEST_PASSWORD },
  });
  check("login ditolak sebelum email terverifikasi",
    unverifiedLogin.status === 403 && unverifiedLogin.body?.code === "EMAIL_NOT_VERIFIED",
    `${unverifiedLogin.status} ${unverifiedLogin.body?.code ?? ""}`);

  const invalidCode = storedCode.rows[0].token_hash ===
    hashEmailVerificationCode(userId, "000000", env.jwt.accessSecret)
    ? "000001"
    : "000000";
  const invalidVerification = await call("/auth/verify-email", {
    method: "POST",
    body: { email: TEST_EMAIL, code: invalidCode },
  });
  check("kode salah ditolak tanpa detail sensitif",
    invalidVerification.status === 401 && invalidVerification.body?.code === "TOKEN_INVALID");
  const afterInvalid = await query(
    "SELECT attempts FROM email_verification_tokens WHERE id=$1",
    [storedCode.rows[0]?.id],
  );
  check("percobaan kode salah tercatat", Number(afterInvalid.rows[0]?.attempts) === 1);

  for (let attempt = 1; attempt < 5; attempt += 1) {
    await call("/auth/verify-email", {
      method: "POST",
      body: { email: TEST_EMAIL, code: invalidCode },
    });
  }
  const burnedCode = await query(
    "SELECT attempts, used_at FROM email_verification_tokens WHERE id=$1",
    [storedCode.rows[0]?.id],
  );
  check("kode dibakar setelah lima tebakan salah",
    Number(burnedCode.rows[0]?.attempts) === 5 && burnedCode.rows[0]?.used_at !== null);

  const immediateResend = await call("/auth/verify-email/resend", {
    method: "POST",
    body: { email: TEST_EMAIL },
  });
  check("resend selalu memberi respons generik", immediateResend.status === 200);
  const beforeCooldown = await query(
    "SELECT COUNT(*)::int total FROM email_verification_tokens WHERE user_id=$1",
    [userId],
  );
  check("cooldown mencegah kode baru terlalu cepat", beforeCooldown.rows[0].total === 1);

  await query(
    "UPDATE email_verification_tokens SET created_at=NOW()-INTERVAL '2 minutes' WHERE id=$1",
    [storedCode.rows[0].id],
  );
  const resend = await call("/auth/verify-email/resend", {
    method: "POST",
    body: { email: TEST_EMAIL },
  });
  check("resend setelah cooldown berhasil", resend.status === 200);
  const resentCodes = await query(
    `SELECT id, used_at FROM email_verification_tokens
      WHERE user_id=$1 ORDER BY id DESC`,
    [userId],
  );
  check("resend membakar kode lama dan membuat satu kode baru",
    resentCodes.rows.length === 2 && resentCodes.rows[1].used_at !== null && resentCodes.rows[0].used_at === null);

  // Kode asli hanya ada di email. Untuk smoke otomatis, ganti HASH pada
  // fixture dengan kode yang diketahui; API tetap tidak pernah menerimanya
  // dari jalur lain dan seluruh transaksi verifikasi tetap diuji nyata.
  const verificationCode = "483921";
  const activeCodeId = resentCodes.rows[0].id;
  await query(
    "UPDATE email_verification_tokens SET token_hash=$2 WHERE id=$1",
    [activeCodeId, hashEmailVerificationCode(userId, verificationCode, env.jwt.accessSecret)],
  );
  const verifiedJar = new Jar();
  const verified = await call("/auth/verify-email", {
    method: "POST",
    jar: verifiedJar,
    body: { email: TEST_EMAIL, code: verificationCode },
  });
  check("kode benar memverifikasi sekaligus masuk", verified.status === 200);
  check("status email terverifikasi dikembalikan", verified.body?.data?.user?.emailVerified === true);
  check("access token diterbitkan setelah verifikasi",
    typeof verified.body?.data?.accessToken === "string");
  const verifiedCookie = verified.setCookie[0] ?? "";
  check("cookie HttpOnly dipasang setelah verifikasi", /HttpOnly/i.test(verifiedCookie));
  check("cookie dibatasi ke path auth", /Path=\/api\/v1\/auth/i.test(verifiedCookie),
    verifiedCookie.match(/Path=[^;]+/i)?.[0] ?? "");

  const replay = await call("/auth/verify-email", {
    method: "POST",
    body: { email: TEST_EMAIL, code: verificationCode },
  });
  check("kode yang sudah dipakai tidak dapat diputar ulang", replay.status === 401);

  // ── Login ─────────────────────────────────────────────────────────────
  console.log(c.b("\n  Login"));
  const loginJar = new Jar();
  const login = await call("/auth/login", {
    method: "POST", jar: loginJar,
    body: { email: TEST_EMAIL, password: TEST_PASSWORD },
  });
  check("login berhasil", login.status === 200, `${login.status}`);
  const accessToken = login.body?.data?.accessToken;
  check("access token diterbitkan", typeof accessToken === "string" && accessToken.length > 40);
  check("TTL 15 menit", login.body?.data?.expiresIn === 900, `${login.body?.data?.expiresIn}s`);

  const wrong = await call("/auth/login", {
    method: "POST", body: { email: TEST_EMAIL, password: "SalahSekali9!" },
  });
  check("kata sandi salah ditolak", wrong.status === 401, `${wrong.body?.code}`);

  const ghost = await call("/auth/login", {
    method: "POST", body: { email: `hantu+${STAMP}@signlearn.test`, password: "SalahSekali9!" },
  });
  check("email tak dikenal = pesan identik", ghost.body?.message === wrong.body?.message,
    "anti-enumerasi akun");

  // ── Endpoint terproteksi ──────────────────────────────────────────────
  console.log(c.b("\n  Endpoint terproteksi"));
  const me = await call("/auth/me", { token: accessToken });
  check("/auth/me dengan token", me.status === 200 && me.body?.data?.user?.email === TEST_EMAIL);

  const noToken = await call("/auth/me");
  check("/auth/me tanpa token ditolak", noToken.status === 401 && noToken.body?.code === "TOKEN_MISSING",
    noToken.body?.code);

  const badToken = await call("/auth/me", { token: "token.yang.dipalsukan" });
  check("token palsu ditolak", badToken.status === 401 && badToken.body?.code === "TOKEN_INVALID",
    badToken.body?.code);

  // ── Rotasi refresh ────────────────────────────────────────────────────
  console.log(c.b("\n  Rotasi refresh token"));
  const before = loginJar.header();
  const stolen = loginJar.clone(); // simulasi token yang dicuri

  const refreshed = await call("/auth/refresh", { method: "POST", jar: loginJar });
  check("refresh berhasil", refreshed.status === 200, `${refreshed.status}`);
  check("token dirotasi", loginJar.header() !== before);
  /**
   * Yang diuji: token yang diterima BEKERJA — bukan bahwa stringnya berbeda.
   *
   * Versi sebelumnya membandingkan `accessToken !== accessToken lama` dan
   * gagal secara acak. Penyebabnya bukan bug: `iat` dan `exp` pada JWT
   * berresolusi DETIK, jadi ketika login dan refresh terjadi dalam detik yang
   * sama, payload-nya identik — dan HS256 atas payload identik menghasilkan
   * string yang identik pula. "Token barunya harus berbeda" tidak pernah
   * menjadi sifat yang dijamin; "token barunya harus sah" adalah sifat yang
   * benar-benar penting.
   */
  const newToken = refreshed.body?.data?.accessToken;
  check("access token diterbitkan", typeof newToken === "string" && newToken.length > 0);

  const withNewToken = await call("/auth/me", { token: newToken });
  check("access token hasil refresh dapat dipakai", withNewToken.status === 200,
    `${withNewToken.status}`);

  // ── Deteksi pemakaian ulang ───────────────────────────────────────────
  console.log(c.b("\n  Deteksi pencurian token"));
  const reuse = await call("/auth/refresh", { method: "POST", jar: stolen });
  check("token lama ditolak", reuse.status === 401, `${reuse.body?.code}`);
  check("terdeteksi sebagai reuse", reuse.body?.code === "TOKEN_REUSED", reuse.body?.code);

  const afterRevoke = await call("/auth/refresh", { method: "POST", jar: loginJar });
  check("SELURUH rantai sesi dicabut", afterRevoke.status === 401,
    "token sah pun ikut mati — ini yang benar");

  // ── Logout ────────────────────────────────────────────────────────────
  console.log(c.b("\n  Logout"));
  const freshJar = new Jar();
  await call("/auth/login", {
    method: "POST", jar: freshJar, body: { email: TEST_EMAIL, password: TEST_PASSWORD },
  });
  const logout = await call("/auth/logout", { method: "POST", jar: freshJar });
  check("logout berhasil", logout.status === 200);
  check("cookie dihapus", freshJar.cookies.size === 0 || !freshJar.header().includes("slr_rt"));

  const afterLogout = await call("/auth/refresh", { method: "POST", jar: freshJar });
  check("refresh setelah logout gagal", afterLogout.status === 401, afterLogout.body?.code);

  // ── Ringkasan ─────────────────────────────────────────────────────────
  const total = passed + failed;
  console.log(`\n${c.b("  Ringkasan")}`);
  console.log(`  ${passed}/${total} lolos${failed ? c.no(`, ${failed} gagal`) : ""}\n`);

  if (failed === 0) {
    console.log(`  ${c.ok("Autentikasi berfungsi di lingkungan ini.")}\n`);
  }

  console.log(c.dim(`  Bersihkan akun uji:`));
  console.log(c.dim(`    DELETE FROM users WHERE email LIKE '%@signlearn.test';\n`));

  await query("DELETE FROM users WHERE id=$1", [userId]);
  await closePool();
  process.exitCode = failed === 0 ? 0 : 1;
}

main().catch(async (err) => {
  console.error(`\n  ${c.no("Smoke test error:")} ${err.message}\n`);
  await query("DELETE FROM users WHERE email=$1", [TEST_EMAIL]).catch(() => {});
  await closePool().catch(() => {});
  process.exitCode = 1;
});
