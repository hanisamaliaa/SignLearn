/**
 * Perkakas bersama untuk smoke test lewat HTTP.
 *
 * Diekstrak dari `smoke-auth.mjs` ketika modul kedua membutuhkan hal yang
 * sama. Menyalinnya sekali lagi berarti perbaikan pada satu berkas diam-diam
 * tidak berlaku di berkas lain — dan test yang berbohong lebih buruk daripada
 * tidak ada test sama sekali.
 *
 * Seluruh test di sini menembak API yang BENAR-BENAR BERJALAN. Tidak ada mock:
 * yang ingin dibuktikan justru bahwa Express, middleware, dan PostgreSQL
 * bekerja sebagai satu kesatuan.
 */

const BASE = (process.env.API_URL || "http://localhost:4000").replace(/\/$/, "");
export const API = `${BASE}${process.env.API_PREFIX || "/api/v1"}`;
export const HEALTH_URL = `${BASE}/api/health`;

export const c = {
  ok: (s) => `\x1b[32m${s}\x1b[0m`,
  no: (s) => `\x1b[31m${s}\x1b[0m`,
  dim: (s) => `\x1b[90m${s}\x1b[0m`,
  b: (s) => `\x1b[1m${s}\x1b[0m`,
};

const tally = { passed: 0, failed: 0, failures: [] };

export function check(label, condition, detail = "") {
  if (condition) {
    tally.passed++;
    console.log(`  ${c.ok("PASS")}  ${label}${detail ? c.dim("  " + detail) : ""}`);
  } else {
    tally.failed++;
    tally.failures.push(label);
    console.log(`  ${c.no("FAIL")}  ${label}${detail ? c.dim("  " + detail) : ""}`);
  }
}

export function section(title) {
  console.log(c.b(`\n  ${title}`));
}

/**
 * Menutup laporan dan menentukan hasil.
 *
 * Pemanggil mengatur `process.exitCode`, BUKAN memanggil `process.exit()`.
 * Di Windows, keluar paksa sementara masih ada handle fetch yang terbuka
 * memicu abort libuv ("UV_HANDLE_CLOSING") yang menutupi hasil test
 * sesungguhnya dengan crash yang tidak ada hubungannya.
 */
export function summary(title) {
  console.log(c.b(`\n  Ringkasan — ${title}`));
  const line = `  ${tally.passed}/${tally.passed + tally.failed} lolos`;
  console.log(tally.failed ? `${line}${c.no(`, ${tally.failed} gagal`)}` : line);

  if (tally.failed) {
    console.log(c.dim("\n  Yang gagal:"));
    for (const f of tally.failures) console.log(c.dim(`    · ${f}`));
  }
  console.log("");
  return tally.failed === 0;
}

/**
 * Cookie jar sederhana.
 *
 * `fetch` bawaan Node tidak menyimpan cookie, sedangkan seluruh alur refresh
 * bergantung padanya.
 */
export class Jar {
  constructor() { this.cookies = new Map(); }

  absorb(response) {
    for (const line of response.headers.getSetCookie?.() ?? []) {
      const [pair] = line.split(";");
      const idx = pair.indexOf("=");
      const name = pair.slice(0, idx).trim();
      const value = pair.slice(idx + 1).trim();
      if (value === "") this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
  }

  header() {
    return [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
  }
}

export async function call(path, { method = "GET", body, token, jar } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  if (jar?.cookies.size) headers.Cookie = jar.header();

  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  jar?.absorb(res);

  let json = null;
  try { json = await res.json(); } catch { /* 204 dan sejenisnya */ }

  return { status: res.status, body: json, data: json?.data ?? null };
}

/** Menghentikan test lebih awal bila server tidak hidup — sisanya pasti gagal. */
export async function requireServer() {
  const health = await fetch(HEALTH_URL).then((r) => r.json()).catch(() => null);
  check("server merespons", health?.status === "ok",
    health ? `env=${health.environment}` : "tidak dapat dihubungi");

  if (!health) {
    console.log(`\n  ${c.no("Server tidak dapat dihubungi.")} Jalankan 'npm run dev' lebih dulu.\n`);
    process.exit(1);
  }
  return health;
}

// ─── Akun uji ────────────────────────────────────────────────────────────

/**
 * Kata sandi yang lolos `passwordPolicy`: ada kapital, kecil, angka, simbol,
 * tanpa deret berurutan, tanpa pengulangan panjang, dan tidak memuat identitas.
 */
export const TEST_PASSWORD = "Kupu2#Terbang";

export async function registerUser(label = "user") {
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const email = `${label}+${stamp}@signlearn.test`;
  const jar = new Jar();

  const res = await call("/auth/register", {
    method: "POST",
    jar,
    body: { name: `Uji ${label}`, email, password: TEST_PASSWORD },
  });

  if (res.status !== 201) {
    throw new Error(`register gagal (${res.status}): ${JSON.stringify(res.body)}`);
  }

  return {
    email,
    jar,
    id: res.data.user.id,
    token: res.data.accessToken,
    user: res.data.user,
  };
}

/**
 * Masuk sebagai admin hasil seed.
 *
 * Kata sandinya TIDAK punya nilai bawaan di sini. Menanamkan kredensial admin
 * di berkas test adalah cara paling umum kredensial itu berakhir di produksi.
 */
export async function loginAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL || "admin@signlearn.local";
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!password) {
    console.log(`\n  ${c.no("SEED_ADMIN_PASSWORD belum diatur.")}`);
    console.log(c.dim("  Test admin membutuhkannya. Contoh:\n"));
    console.log(c.dim("    SEED_ADMIN_PASSWORD='...' npm run smoke:admin\n"));
    process.exit(1);
  }

  const jar = new Jar();
  const res = await call("/auth/login", { method: "POST", jar, body: { email, password } });

  if (res.status !== 200) {
    throw new Error(`login admin gagal (${res.status}): ${JSON.stringify(res.body)}`);
  }
  return { email, jar, id: res.data.user.id, token: res.data.accessToken, user: res.data.user };
}
