#!/usr/bin/env node
/**
 * Smoke test modul Users & Profile — API Contract §7.1-7.6.
 *
 *   npm run smoke:users
 *
 * Membutuhkan SEED_ADMIN_PASSWORD karena separuh endpoint di sini khusus admin.
 */

import {
  call, check, section, summary, requireServer,
  registerUser, loginAdmin, grantPremiumFixture, closeHarnessDatabase, TEST_PASSWORD, c,
} from "./lib/harness.mjs";

async function main() {
  console.log(`\n${c.b("SignLearn — smoke test users & profile")}`);
  await requireServer();

  const learner = await registerUser("siswa");
  const victim = await registerUser("korban");
  const admin = await loginAdmin();
  await grantPremiumFixture(victim.id);

  // ── GET /users/profile ─────────────────────────────────────────────────
  section("GET /users/profile");

  const anonProfile = await call("/users/profile");
  check("tanpa token ditolak", anonProfile.status === 401, anonProfile.body?.code);

  const profile = await call("/users/profile", { token: learner.token });
  check("dengan token berhasil", profile.status === 200, `${profile.status}`);
  check("mengembalikan pemanggil sendiri", profile.data?.user?.id === learner.id);
  check("id berupa string", typeof profile.data?.user?.id === "string");
  check("hash kata sandi tidak bocor",
    !JSON.stringify(profile.body ?? {}).toLowerCase().includes("passwordhash"));
  check("memuat field kontrak §5.1",
    ["id", "name", "email", "role", "phone", "avatar", "profile", "status", "joinDate"]
      .every((k) => k in (profile.data?.user ?? {})));
  check("akun baru memakai avatar bawaan", profile.data?.user?.avatar === "luna");
  check(
    "tanggal bergabung mengikuti tanggal pembuatan di zona Jakarta",
    profile.data?.user?.joinDate === learner.user?.joinDate,
    profile.data?.user?.joinDate,
  );

  // ── PUT /users/profile ─────────────────────────────────────────────────
  section("PUT /users/profile");

  const anonUpdate = await call("/users/profile", { method: "PUT", body: { name: "Anon" } });
  check("tanpa token ditolak", anonUpdate.status === 401, anonUpdate.body?.code);

  const updated = await call("/users/profile", {
    token: learner.token,
    method: "PUT",
    body: { name: "Rina Wijaya", phone: "081234567890", avatar: "RW", profile: "parent" },
  });
  check("pembaruan berhasil", updated.status === 200, `${updated.status}`);
  check("nama tersimpan", updated.data?.user?.name === "Rina Wijaya");
  check("telepon tersimpan", updated.data?.user?.phone === "081234567890");
  check("profil tersimpan", updated.data?.user?.profile === "parent");

  const persisted = await call("/users/profile", { token: learner.token });
  check("perubahan benar-benar persisten", persisted.data?.user?.name === "Rina Wijaya");

  // Kontrak §7.2: field terlarang DIABAIKAN diam-diam, bukan ditolak — supaya
  // klien lama tidak rusak ketika field baru ditambahkan.
  const escalate = await call("/users/profile", {
    token: learner.token,
    method: "PUT",
    body: { name: "Rina W.", role: "admin", status: "suspended", email: "hacker@evil.test" },
  });
  check("field terlarang tidak menghasilkan error", escalate.status === 200, `${escalate.status}`);
  check("peran TIDAK dapat dinaikkan sendiri", escalate.data?.user?.role === "user");
  check("status TIDAK dapat diubah sendiri", escalate.data?.user?.status === "active");
  check("email TIDAK dapat diubah di sini", escalate.data?.user?.email === learner.email);

  const badProfile = await call("/users/profile", {
    token: learner.token, method: "PUT", body: { profile: "astronaut" },
  });
  check("nilai profile di luar enum ditolak", badProfile.status === 422, `${badProfile.status}`);

  const shortName = await call("/users/profile", {
    token: learner.token, method: "PUT", body: { name: "A" },
  });
  check("nama terlalu pendek ditolak", shortName.status === 422, `${shortName.status}`);

  // Regresi: `body.name.trim()` pada nilai non-string melempar TypeError dan
  // menghasilkan 500, bukan 422 yang seharusnya.
  const numericName = await call("/users/profile", {
    token: learner.token, method: "PUT", body: { name: 12345 },
  });
  check("nama non-string ditolak 422 (bukan 500)", numericName.status === 422, `${numericName.status}`);

  // Regresi: kolom `avatar` adalah VARCHAR(20); tanpa validasi panjang,
  // PostgreSQL melempar 22001 dan pengguna menerima 500.
  const longAvatar = await call("/users/profile", {
    token: learner.token, method: "PUT", body: { avatar: "X".repeat(50) },
  });
  check("avatar terlalu panjang ditolak 422 (bukan 500)", longAvatar.status === 422, `${longAvatar.status}`);

  const longPhone = await call("/users/profile", {
    token: learner.token, method: "PUT", body: { phone: "0".repeat(60) },
  });
  check("telepon terlalu panjang ditolak 422 (bukan 500)", longPhone.status === 422, `${longPhone.status}`);

  const emptyUpdate = await call("/users/profile", {
    token: learner.token, method: "PUT", body: {},
  });
  check("body tanpa field yang dapat diubah ditolak", emptyUpdate.status === 422, `${emptyUpdate.status}`);

  // ── GET /users — admin ─────────────────────────────────────────────────
  section("GET /users — admin");

  const anonList = await call("/users");
  check("tanpa token ditolak", anonList.status === 401, anonList.body?.code);

  const userList = await call("/users", { token: learner.token });
  check("peran user ditolak", userList.status === 403, userList.body?.code);

  const list = await call("/users", { token: admin.token });
  check("admin dapat melihat daftar", list.status === 200, `${list.status}`);
  check("berbentuk items + pagination",
    Array.isArray(list.data?.items) && typeof list.data?.pagination === "object");
  check("pagination lengkap sesuai §2.7",
    ["page", "limit", "total", "totalPages", "hasNext", "hasPrev"]
      .every((k) => k in (list.data?.pagination ?? {})));
  check("hash kata sandi tidak bocor di listing",
    !JSON.stringify(list.body ?? {}).toLowerCase().includes("passwordhash"));
  check("status paket tersedia untuk setiap pengguna",
    list.data?.items?.every((user) => typeof user.isPremium === "boolean") === true);

  const paged = await call("/users?page=1&limit=1", { token: admin.token });
  check("limit dipatuhi", paged.data?.items?.length === 1, `${paged.data?.items?.length}`);
  check("total menghitung seluruh baris", paged.data?.pagination?.total >= 3,
    `total=${paged.data?.pagination?.total}`);

  const clamped = await call("/users?limit=9999", { token: admin.token });
  check("limit dibatasi maksimum 100", clamped.data?.pagination?.limit === 100,
    `limit=${clamped.data?.pagination?.limit}`);

  const searched = await call(`/users?q=${encodeURIComponent(victim.email)}`, { token: admin.token });
  check("pencarian q menemukan email", searched.data?.items?.length === 1,
    `${searched.data?.items?.length} hasil`);
  check("pelanggan Premium ditandai beserta masa aktifnya",
    searched.data?.items?.[0]?.isPremium === true && Boolean(searched.data.items[0].premiumUntil));

  const byRole = await call("/users?role=admin", { token: admin.token });
  check("filter role bekerja",
    byRole.data?.items?.length > 0 && byRole.data.items.every((u) => u.role === "admin"));

  const byStatus = await call("/users?status=active", { token: admin.token });
  check("filter status bekerja",
    byStatus.data?.items?.every((u) => u.status === "active") === true);

  const badSort = await call("/users?sortBy=password_hash", { token: admin.token });
  check("sortBy di luar allowlist ditolak", badSort.status === 422, `${badSort.status}`);

  const badRole = await call("/users?role=superadmin", { token: admin.token });
  check("filter role tidak dikenal ditolak", badRole.status === 422, `${badRole.status}`);

  const sorted = await call("/users?sortBy=name&sortDir=asc", { token: admin.token });
  check("sortBy yang diizinkan diterima", sorted.status === 200, `${sorted.status}`);

  // ── GET /users/:id — admin ─────────────────────────────────────────────
  section("GET /users/:id — admin");

  const userDetailAsUser = await call(`/users/${victim.id}`, { token: learner.token });
  check("peran user ditolak", userDetailAsUser.status === 403, userDetailAsUser.body?.code);

  const detail = await call(`/users/${victim.id}`, { token: admin.token });
  check("admin dapat melihat detail", detail.status === 200, `${detail.status}`);
  check("memuat user", detail.data?.user?.id === victim.id);
  check("memuat stats sesuai §7.4",
    ["coursesStarted", "lessonsCompleted", "quizzesPassed", "lastActiveAt"]
      .every((k) => k in (detail.data?.stats ?? {})));

  const missing = await call("/users/99999999", { token: admin.token });
  check("id tidak ada = 404", missing.status === 404, `${missing.status}`);

  const badId = await call("/users/bukan-angka", { token: admin.token });
  check("id bukan angka ditolak rapi (bukan 500)", badId.status === 404 || badId.status === 422,
    `${badId.status}`);

  // ── PUT /users/:id — admin ─────────────────────────────────────────────
  section("PUT /users/:id — admin");

  const editAsUser = await call(`/users/${victim.id}`, {
    token: learner.token, method: "PUT", body: { status: "suspended" },
  });
  check("peran user ditolak", editAsUser.status === 403, editAsUser.body?.code);

  const suspended = await call(`/users/${victim.id}`, {
    token: admin.token, method: "PUT", body: { status: "suspended", profile: "deaf" },
  });
  check("admin dapat mengubah status", suspended.status === 200, `${suspended.status}`);
  check("status tersimpan", suspended.data?.user?.status === "suspended");
  check("profile tersimpan", suspended.data?.user?.profile === "deaf");

  const activeTokenAfterSuspend = await call("/users/profile", { token: victim.token });
  check("access token aktif langsung ditolak setelah suspend",
    activeTokenAfterSuspend.status === 403 &&
      activeTokenAfterSuspend.body?.code === "ACCOUNT_SUSPENDED",
    `${activeTokenAfterSuspend.status} ${activeTokenAfterSuspend.body?.code ?? ""}`);

  // Akun yang ditangguhkan harus benar-benar tidak dapat masuk.
  const suspendedLogin = await call("/auth/login", {
    method: "POST", body: { email: victim.email, password: TEST_PASSWORD },
  });
  check("akun suspended tidak dapat login", suspendedLogin.status === 403,
    suspendedLogin.body?.code);

  const promoted = await call(`/users/${victim.id}`, {
    token: admin.token, method: "PUT", body: { role: "admin", status: "active" },
  });
  check("admin dapat mengubah peran", promoted.data?.user?.role === "admin", `${promoted.status}`);

  const revokedTokenAfterReactivate = await call("/users/profile", { token: victim.token });
  check("token lama tetap tercabut setelah akun diaktifkan kembali",
    revokedTokenAfterReactivate.status === 401 &&
      revokedTokenAfterReactivate.body?.code === "TOKEN_INVALID",
    `${revokedTokenAfterReactivate.status} ${revokedTokenAfterReactivate.body?.code ?? ""}`);

  const demoteBack = await call(`/users/${victim.id}`, {
    token: admin.token, method: "PUT", body: { role: "user" },
  });
  check("peran dapat diturunkan kembali", demoteBack.data?.user?.role === "user");

  // Kontrak §7.5 — tanpa penjaga ini, admin terakhir dapat mengunci dirinya keluar.
  const selfDemote = await call(`/users/${admin.id}`, {
    token: admin.token, method: "PUT", body: { role: "user" },
  });
  check("admin TIDAK dapat menurunkan perannya sendiri", selfDemote.status === 422,
    `${selfDemote.status}`);

  const selfSuspend = await call(`/users/${admin.id}`, {
    token: admin.token, method: "PUT", body: { status: "suspended" },
  });
  check("admin TIDAK dapat menonaktifkan dirinya sendiri", selfSuspend.status === 422,
    `${selfSuspend.status}`);

  const stillAdmin = await call("/auth/me", { token: admin.token });
  check("admin tetap admin setelah percobaan itu", stillAdmin.data?.user?.role === "admin");

  const changeEmail = await call(`/users/${victim.id}`, {
    token: admin.token, method: "PUT", body: { email: "diubah@evil.test" },
  });
  check("email tidak dapat diubah lewat endpoint ini",
    changeEmail.status === 422 || changeEmail.data?.user?.email === victim.email,
    `${changeEmail.status}`);

  const changePassword = await call(`/users/${victim.id}`, {
    token: admin.token, method: "PUT", body: { password: "SangatRahasia#9" },
  });
  check("kata sandi tidak dapat diubah lewat endpoint ini",
    changePassword.status === 422 || changePassword.status === 200, `${changePassword.status}`);

  const stillLogin = await call("/auth/login", {
    method: "POST", body: { email: victim.email, password: TEST_PASSWORD },
  });
  check("kata sandi lama masih berlaku", stillLogin.status === 200, `${stillLogin.status}`);

  const badRoleValue = await call(`/users/${victim.id}`, {
    token: admin.token, method: "PUT", body: { role: "dewa" },
  });
  check("peran tidak dikenal ditolak", badRoleValue.status === 422, `${badRoleValue.status}`);

  const editMissing = await call("/users/99999999", {
    token: admin.token, method: "PUT", body: { status: "active" },
  });
  check("mengubah id tidak ada = 404", editMissing.status === 404, `${editMissing.status}`);

  // ── DELETE /users/:id — admin ──────────────────────────────────────────
  section("DELETE /users/:id — admin");

  const deleteAsUser = await call(`/users/${victim.id}`, {
    token: learner.token, method: "DELETE",
  });
  check("peran user ditolak", deleteAsUser.status === 403, deleteAsUser.body?.code);

  const selfDelete = await call(`/users/${admin.id}`, { token: admin.token, method: "DELETE" });
  check("admin TIDAK dapat menghapus dirinya sendiri", selfDelete.status === 422,
    `${selfDelete.status}`);

  const removed = await call(`/users/${victim.id}`, { token: admin.token, method: "DELETE" });
  check("admin dapat menghapus pengguna", removed.status === 200, `${removed.status}`);
  check("data null sesuai §7.6", removed.data === null);

  // Soft delete: baris HARUS masih ada. Hard delete akan meng-cascade
  // lesson_progress dan quiz_results — riwayat belajar hilang permanen.
  const afterDelete = await call(`/users/${victim.id}`, { token: admin.token });
  check("baris TIDAK dihapus (soft delete)", afterDelete.status === 200, `${afterDelete.status}`);
  check("status menjadi inactive", afterDelete.data?.user?.status === "inactive",
    afterDelete.data?.user?.status);

  const deletedLogin = await call("/auth/login", {
    method: "POST", body: { email: victim.email, password: TEST_PASSWORD },
  });
  check("pengguna nonaktif tidak dapat login", deletedLogin.status === 403, deletedLogin.body?.code);

  const deleteMissing = await call("/users/99999999", { token: admin.token, method: "DELETE" });
  check("menghapus id tidak ada = 404", deleteMissing.status === 404, `${deleteMissing.status}`);

  process.exitCode = summary("users & profile") ? 0 : 1;
}

main().catch((err) => {
  console.error(`\n  ${c.no("Test berhenti:")} ${err.message}\n`);
  process.exitCode = 1;
}).finally(() => closeHarnessDatabase());
