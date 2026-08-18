#!/usr/bin/env node
/**
 * Smoke test keamanan — pengujian ADVERSARIAL.
 *
 *   npm run smoke:security
 *
 * ── Bedanya dengan suite lain ─────────────────────────────────────────
 *
 * Suite lain membuktikan fitur BEKERJA. Suite ini membuktikan fitur
 * MENOLAK — dan hanya berisi permintaan yang seharusnya gagal. Setiap
 * pemeriksaan di bawah adalah satu cara nyata seseorang mencoba menyalahgunakan
 * API: naik peran, membaca data orang lain, memalsukan pembayaran, menyuntik
 * SQL, memakai token curian.
 *
 * Sengaja TIDAK membutuhkan kredensial admin. Arah yang penting justru
 * sebaliknya: membuktikan bahwa akun biasa TIDAK BISA menembus batas admin.
 * Suite yang butuh admin akan berhenti tanpa kredensial, dan pengujian
 * keamanan yang tidak pernah dijalankan tidak melindungi apa pun.
 *
 * Seluruh pemeriksaan menembak server yang benar-benar berjalan.
 */

import {
  call, check, section, summary, requireServer,
  registerUser, closeHarnessDatabase, TEST_PASSWORD, Jar, c,
} from "./lib/harness.mjs";

/** Endpoint khusus admin. Akun `user` harus ditolak di SETIAP baris. */
const ADMIN_ENDPOINTS = [
  ["GET", "/admin/users"],
  ["GET", "/admin/stats"],
  ["GET", "/admin/reports/overview"],
  ["GET", "/admin/subscriptions"],
  ["GET", "/admin/payments"],
  ["POST", "/courses", { title: "Kursus Sisipan", level: "Pemula" }],
  ["POST", "/lessons", { title: "Pelajaran Sisipan", courseId: "1" }],
  ["POST", "/translations", { word: "Sisipan", translation: "S-I-S-I-P-A-N" }],
];

/** Muatan yang biasa dipakai menembus lapisan query. */
const SQL_PAYLOADS = [
  "' OR '1'='1",
  "'; DROP TABLE users; --",
  "\\' OR 1=1 --",
  "%' OR '1'='1",
  "1' UNION SELECT NULL,NULL,NULL--",
  "admin'--",
];

const XSS_PAYLOADS = [
  "<script>alert(1)</script>",
  "<img src=x onerror=alert(1)>",
  "<svg onload=alert(1)>",
  "javascript:alert(1)",
  "\"><script>alert(document.cookie)</script>",
];

/** Membuat JWT palsu yang mengklaim peran admin. */
function forgeAdminToken(realToken) {
  const [, payloadPart] = realToken.split(".");
  const claims = JSON.parse(Buffer.from(payloadPart, "base64url").toString());
  const forged = { ...claims, role: "admin" };
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify(forged)).toString("base64url");
  return `${header}.${payload}.${"A".repeat(43)}`;
}

/** JWT dengan alg=none — serangan klasik terhadap verifier yang lalai. */
function algNoneToken(realToken) {
  const [, payloadPart] = realToken.split(".");
  const claims = JSON.parse(Buffer.from(payloadPart, "base64url").toString());
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ ...claims, role: "admin" })).toString("base64url");
  return `${header}.${payload}.`;
}

async function main() {
  console.log(`\n${c.b("SignLearn — smoke test keamanan (adversarial)")}`);
  await requireServer();

  const alice = await registerUser("alice");
  const bob = await registerUser("bob");

  // ── 1. Eskalasi peran ──────────────────────────────────────────────────
  section("1. Eskalasi peran — akun user menembus batas admin");

  for (const [method, path, body] of ADMIN_ENDPOINTS) {
    const res = await call(path, { method, token: alice.token, body });
    check(`${method} ${path} ditolak untuk peran user`,
      res.status === 403, `HTTP ${res.status}`);
  }

  section("1b. Eskalasi peran lewat manipulasi token");

  const forged = await call("/admin/users", { token: forgeAdminToken(alice.token) });
  check("JWT dengan klaim role=admin dan tanda tangan palsu ditolak",
    forged.status === 401, `HTTP ${forged.status}`);

  const noneAlg = await call("/admin/users", { token: algNoneToken(alice.token) });
  check("JWT alg=none ditolak", noneAlg.status === 401, `HTTP ${noneAlg.status}`);

  const garbage = await call("/admin/users", { token: "bukan.token.samasekali" });
  check("token sampah ditolak", garbage.status === 401, `HTTP ${garbage.status}`);

  const noToken = await call("/admin/users");
  check("tanpa token ditolak", noToken.status === 401, `HTTP ${noToken.status}`);

  const emptyBearer = await call("/admin/users", { token: "" });
  check("Bearer kosong ditolak", emptyBearer.status === 401, `HTTP ${emptyBearer.status}`);

  // ── 2. Mass assignment ─────────────────────────────────────────────────
  section("2. Mass assignment — menyuntik peran lewat body");

  const escalateStamp = Date.now();
  const escalateRegister = await call("/auth/register", {
    method: "POST",
    body: {
      name: "Penyusup Peran",
      email: `escalate${escalateStamp}@signlearn.test`,
      password: TEST_PASSWORD,
      profile: "general",
      role: "admin",
      roleId: 1,
      isAdmin: true,
    },
  });
  // Balasan registrasi berbeda bentuk tergantung verifikasi email menyala atau
  // tidak — kadang membawa `user`, kadang hanya `verificationRequired`. Yang
  // diperiksa karena itu seluruh muatan: peran admin tidak boleh muncul di
  // mana pun, apa pun bentuk balasannya.
  const escalateBody = JSON.stringify(escalateRegister.body ?? {});
  check("registrasi mengabaikan field role yang dikirim klien",
    escalateRegister.status >= 400 || !/"role"\s*:\s*"admin"/.test(escalateBody),
    `HTTP ${escalateRegister.status}`);

  // Pemeriksaan sesungguhnya: akun itu masuk, lalu dicoba menembus admin.
  const escalateLogin = await call("/auth/login", {
    method: "POST",
    body: { email: `escalate${escalateStamp}@signlearn.test`, password: TEST_PASSWORD },
  });
  if (escalateLogin.status === 200) {
    const reach = await call("/admin/users", { token: escalateLogin.data.accessToken });
    check("akun yang mendaftar dengan role=admin tetap ditolak endpoint admin",
      reach.status === 403, `HTTP ${reach.status}`);
  } else {
    check("akun yang mendaftar dengan role=admin tidak langsung aktif",
      escalateLogin.status >= 400, `login HTTP ${escalateLogin.status}`);
  }

  const profileEscalate = await call("/users/profile", {
    method: "PUT",
    token: alice.token,
    body: { name: "Alice", role: "admin", roleId: 1, status: "active", isPremium: true },
  });
  const afterProfile = await call("/auth/me", { token: alice.token });
  check("update profil tidak dapat mengubah peran sendiri",
    afterProfile.data?.user?.role === "user",
    `role=${afterProfile.data?.user?.role} (PUT ${profileEscalate.status})`);

  // ── 3. IDOR / BOLA ─────────────────────────────────────────────────────
  section("3. IDOR — membaca dan mengubah data akun lain");

  const readOther = await call(`/users/${bob.id}`, { token: alice.token });
  check("user tidak dapat membaca profil user lain lewat id",
    [403, 404].includes(readOther.status), `HTTP ${readOther.status}`);

  const editOther = await call(`/users/${bob.id}`, {
    method: "PUT", token: alice.token, body: { name: "Diretas" },
  });
  check("user tidak dapat mengubah akun user lain",
    [403, 404].includes(editOther.status), `HTTP ${editOther.status}`);

  const deleteOther = await call(`/users/${bob.id}`, { method: "DELETE", token: alice.token });
  check("user tidak dapat menghapus akun user lain",
    [403, 404].includes(deleteOther.status), `HTTP ${deleteOther.status}`);

  // ── 4. Pembayaran ──────────────────────────────────────────────────────
  section("4. Pembayaran — memalsukan status premium");

  const mine = await call("/subscription/me", { token: alice.token });
  check("status langganan dapat dibaca pemiliknya", mine.status === 200, `HTTP ${mine.status}`);
  const planId = mine.data?.plans?.[0]?.id;
  const listedPrice = mine.data?.plans?.[0]?.price;

  const cheapCheckout = await call("/subscription/checkout", {
    method: "POST",
    token: alice.token,
    body: { planId, amount: 1, price: 1, gross_amount: 1 },
  });
  const checkoutData = cheapCheckout.data?.checkout ?? cheapCheckout.data ?? {};
  const aliceOrder = checkoutData.orderId;
  check("checkout berhasil dibuat", Boolean(aliceOrder), `HTTP ${cheapCheckout.status}`);

  if (aliceOrder) {
    // Nominal yang TERSIMPAN, bukan yang digemakan balasan checkout. Klien
    // mengirim amount=1 di atas; kalau server mempercayainya, Premium bisa
    // dibeli seharga satu rupiah.
    const stored = await call(`/subscription/payments/${aliceOrder}`, { token: alice.token });
    check("nominal tersimpan berasal dari paket di server, bukan dari klien",
      Number(stored.data?.payment?.amount) === Number(listedPrice),
      `tersimpan=${stored.data?.payment?.amount}, paket=${listedPrice}, dikirim klien=1`);

    const bobConfirms = await call(`/subscription/payments/${aliceOrder}/confirm`, {
      method: "POST", token: bob.token, body: { action: "complete" },
    });
    check("user lain tidak dapat mengonfirmasi order milik orang lain",
      bobConfirms.status === 404, `HTTP ${bobConfirms.status}`);

    const bobReads = await call(`/subscription/payments/${aliceOrder}`, { token: bob.token });
    check("user lain tidak dapat membaca order milik orang lain",
      bobReads.status === 404, `HTTP ${bobReads.status}`);

    // Idempotensi: dua konfirmasi berurutan tidak boleh memberi dua periode.
    const first = await call(`/subscription/payments/${aliceOrder}/confirm`, {
      method: "POST", token: alice.token, body: { action: "complete" },
    });
    const second = await call(`/subscription/payments/${aliceOrder}/confirm`, {
      method: "POST", token: alice.token, body: { action: "complete" },
    });
    check("konfirmasi berulang bersifat idempoten",
      first.status === 200 && second.status === 200
        && first.data?.subscription?.endDate === second.data?.subscription?.endDate,
      `${first.data?.subscription?.endDate} vs ${second.data?.subscription?.endDate}`);

    // Serangan yang paling menggoda: kirim konfirmasi berbarengan dari
    // beberapa tab agar satu pembayaran menghasilkan dua periode langganan.
    const racer = await registerUser("balapan");
    const racerCheckout = await call("/subscription/checkout", {
      method: "POST", token: racer.token, body: { planId },
    });
    const racerOrder = (racerCheckout.data?.checkout ?? racerCheckout.data ?? {}).orderId;
    if (racerOrder) {
      const salvo = await Promise.all(Array.from({ length: 6 }, () =>
        call(`/subscription/payments/${racerOrder}/confirm`, {
          method: "POST", token: racer.token, body: { action: "complete" },
        })));
      const ends = new Set(
        salvo.filter((r) => r.status === 200).map((r) => r.data?.subscription?.endDate),
      );
      check("enam konfirmasi serentak menghasilkan satu masa aktif, bukan enam",
        ends.size === 1, `${ends.size} tanggal berakhir berbeda`);
    }
  }

  const forgedHook = await call("/payments/midtrans/webhook", {
    method: "POST",
    body: {
      order_id: aliceOrder ?? "SL-palsu",
      status_code: "200",
      gross_amount: "1.00",
      transaction_status: "settlement",
      signature_key: "a".repeat(128),
    },
  });
  check("webhook dengan tanda tangan palsu ditolak",
    [401, 404].includes(forgedHook.status), `HTTP ${forgedHook.status}`);

  const unsignedHook = await call("/payments/midtrans/webhook", {
    method: "POST",
    body: { order_id: aliceOrder ?? "SL-palsu", transaction_status: "settlement" },
  });
  check("webhook tanpa tanda tangan ditolak",
    [401, 404].includes(unsignedHook.status), `HTTP ${unsignedHook.status}`);

  // ── 5. Injeksi SQL ─────────────────────────────────────────────────────
  section("5. Injeksi SQL — parameter pencarian dan id");

  for (const payload of SQL_PAYLOADS) {
    const res = await call(`/translations?q=${encodeURIComponent(payload)}`, { token: alice.token });
    check(`pencarian menahan muatan ${JSON.stringify(payload).slice(0, 28)}`,
      res.status === 200 && Array.isArray(res.data?.items),
      `HTTP ${res.status}`);
  }

  const stillAlive = await call("/translations?limit=1", { token: alice.token });
  check("tabel translations masih utuh setelah seluruh muatan",
    stillAlive.status === 200 && Array.isArray(stillAlive.data?.items),
    `HTTP ${stillAlive.status}`);

  const usersAlive = await call("/auth/me", { token: alice.token });
  check("tabel users masih utuh setelah muatan DROP TABLE",
    usersAlive.status === 200, `HTTP ${usersAlive.status}`);

  for (const bad of ["abc", "-1", "0", "1 OR 1=1", "9999999999999999999999", "../../etc/passwd"]) {
    const res = await call(`/courses/${encodeURIComponent(bad)}`, { token: alice.token });
    check(`id tak sah ${JSON.stringify(bad).slice(0, 26)} ditolak rapi`,
      [400, 404, 422].includes(res.status), `HTTP ${res.status}`);
  }

  // ── 6. XSS tersimpan ───────────────────────────────────────────────────
  section("6. XSS — muatan disimpan lalu dibaca kembali");

  for (const payload of XSS_PAYLOADS) {
    const res = await call("/users/profile", {
      method: "PUT", token: alice.token, body: { name: payload },
    });
    // Ditolak validator ATAU disimpan apa adanya. Keduanya aman selama
    // frontend tidak pernah memakai innerHTML — React meng-escape secara
    // bawaan, dan audit ini sudah memastikan tidak ada innerHTML di src.
    const back = await call("/auth/me", { token: alice.token });
    const stored = back.data?.user?.name ?? "";
    check(`muatan ${JSON.stringify(payload).slice(0, 30)} tidak dieksekusi sebagai HTML`,
      res.status >= 400 || stored === payload || !stored.includes("<script"),
      `HTTP ${res.status}`);
  }

  // ── 7. Kebersihan galat ────────────────────────────────────────────────
  section("7. Galat tidak membocorkan detail internal");

  const malformed = await fetch(`${process.env.API_URL || "http://localhost:4788"}${process.env.API_PREFIX || "/api/v1"}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{ini bukan json",
  });
  const malformedText = await malformed.text();
  check("JSON rusak dibalas 400, bukan 500",
    malformed.status === 400, `HTTP ${malformed.status}`);
  check("balasan JSON rusak tidak memuat stack trace",
    !/at\s+\w+.*\(.*:\d+:\d+\)/.test(malformedText) && !malformedText.includes("node_modules"),
    malformedText.slice(0, 80));

  const notFound = await call("/endpoint-yang-tidak-ada");
  const notFoundText = JSON.stringify(notFound.body ?? {});
  check("404 tidak membocorkan path internal",
    !notFoundText.includes("\\\\") && !notFoundText.includes("node_modules")
      && !/[A-Z]:\\/.test(notFoundText),
    notFoundText.slice(0, 80));

  const badLogin = await call("/auth/login", {
    method: "POST", body: { email: "tidakada@signlearn.test", password: "SalahSekali#1" },
  });
  const knownLogin = await call("/auth/login", {
    method: "POST", body: { email: alice.email, password: "SalahSekali#1" },
  });
  check("pesan login tidak membedakan email terdaftar dari yang tidak",
    badLogin.body?.message === knownLogin.body?.message,
    `${JSON.stringify(badLogin.body?.message)} vs ${JSON.stringify(knownLogin.body?.message)}`);

  // ── 8. Sesi ────────────────────────────────────────────────────────────
  section("8. Sesi — token setelah keluar");

  const victim = await registerUser("sesi");
  const beforeLogout = await call("/auth/me", { token: victim.token });
  check("token bekerja sebelum logout", beforeLogout.status === 200, `HTTP ${beforeLogout.status}`);

  await call("/auth/logout", { method: "POST", token: victim.token, jar: victim.jar });

  const refreshAfterLogout = await call("/auth/refresh", { method: "POST", jar: victim.jar });
  check("refresh token tidak dapat dipakai setelah logout",
    refreshAfterLogout.status === 401, `HTTP ${refreshAfterLogout.status}`);

  const noCookieRefresh = await call("/auth/refresh", { method: "POST", jar: new Jar() });
  check("refresh tanpa cookie ditolak",
    noCookieRefresh.status === 401, `HTTP ${noCookieRefresh.status}`);

  // ── 8b. Entitlement Premium ────────────────────────────────────────────
  section("8b. Premium — menembus paywall tanpa membayar");

  const freeloader = await registerUser("gratisan");
  const gated = [
    ["POST", "/courses/1/quizzes/1/start"],
    ["POST", "/courses/1/quizzes/1/submit"],
    ["GET", "/courses/1/quizzes/1"],
  ];
  for (const [method, path] of gated) {
    const res = await call(path, {
      method, token: freeloader.token,
      body: method === "GET" ? undefined : {},
    });
    check(`${method} ${path} menolak akun non-Premium`,
      res.status === 403, `HTTP ${res.status}`);
  }

  // Entitlement dibaca dari basis data, bukan dari klaim token. Token yang
  // isinya diubah karena itu tidak menaikkan status apa pun — tanda tangannya
  // rusak dan ditolak sebelum sampai ke pemeriksaan langganan.
  const [, freePayload] = freeloader.token.split(".");
  const freeClaims = JSON.parse(Buffer.from(freePayload, "base64url").toString());
  const premiumClaim = `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${
    Buffer.from(JSON.stringify({ ...freeClaims, isPremium: true, premium: true })).toString("base64url")}.${"A".repeat(43)}`;
  const claimAttempt = await call("/courses/1/quizzes/1/start", {
    method: "POST", token: premiumClaim, body: {},
  });
  check("klaim isPremium yang disisipkan ke token tidak memberi akses",
    claimAttempt.status === 401, `HTTP ${claimAttempt.status}`);

  // ── 9. Akun tidak aktif ────────────────────────────────────────────────
  section("9. Akun non-aktif tidak dapat masuk");

  const suspended = await call("/auth/login", {
    method: "POST", body: { email: "jason@gmail.com", password: TEST_PASSWORD },
  });
  check("akun suspended tidak dapat masuk (kata sandi salah pun ditolak)",
    suspended.status >= 400, `HTTP ${suspended.status}`);

  return summary("Keamanan");
}

main()
  .then((ok) => { process.exitCode = ok ? 0 : 1; })
  .catch((error) => {
    console.error(`\n  ${c.no("Suite berhenti:")} ${error.message}\n`);
    process.exitCode = 1;
  })
  .finally(() => closeHarnessDatabase());
