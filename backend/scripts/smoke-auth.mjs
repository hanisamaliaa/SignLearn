#!/usr/bin/env node
/**
 * Smoke test alur autentikasi.
 *
 *   npm run smoke                      # menguji http://localhost:4000
 *   API_URL=https://... npm run smoke  # menguji environment lain
 *
 * Menguji API yang BENAR-BENAR BERJALAN lewat HTTP — bukan unit test.
 * Menjawab satu pertanyaan: "apakah autentikasi bekerja di lingkungan ini?"
 *
 * Dipakai setelah deploy, setelah ganti DATABASE_URL, atau kapan pun ada
 * yang bertanya "apakah backend-nya sudah jalan?".
 */

const BASE = (process.env.API_URL || "http://localhost:4000").replace(/\/$/, "");
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
  check("id berupa string", typeof reg.body?.data?.user?.id === "string", `${typeof reg.body?.data?.user?.id}`);
  check("peran default 'user'", reg.body?.data?.user?.role === "user");
  check("refreshToken TIDAK di body", !("refreshToken" in (reg.body?.data ?? {})));
  check("hash kata sandi tidak bocor",
    !Object.keys(reg.body?.data?.user ?? {}).some((k) => /password/i.test(k)));

  const cookieLine = reg.setCookie[0] ?? "";
  check("cookie HttpOnly dipasang", /HttpOnly/i.test(cookieLine));
  check("cookie dibatasi ke path auth", /Path=\/api\/v1\/auth/i.test(cookieLine),
    cookieLine.match(/Path=[^;]+/i)?.[0] ?? "");

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
  check("access token baru diterbitkan",
    typeof refreshed.body?.data?.accessToken === "string" &&
    refreshed.body.data.accessToken !== accessToken);

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

  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(`\n  ${c.no("Smoke test error:")} ${err.message}\n`);
  process.exit(1);
});
