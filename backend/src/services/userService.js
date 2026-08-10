import * as userRepo from "../repositories/userRepository.js";
import * as tokenService from "./tokenService.js";
import { ApiError } from "../utils/ApiError.js";
import { paginate, meta } from "../utils/pagination.js";

/**
 * User service — profil sendiri dan administrasi pengguna (API Contract §7).
 *
 * Controller hanya menerjemahkan HTTP; seluruh aturan ada di sini dan karenanya
 * dapat diuji tanpa Express.
 */

/**
 * `id` pada path harus bilangan bulat positif.
 *
 * Tanpa penjagaan ini, `/users/abc` sampai ke PostgreSQL, ditolak sebagai
 * SQLSTATE 22P02, dan pengguna menerima 422 "format parameter tidak valid" —
 * jawaban yang membingungkan untuk pertanyaan "apakah pengguna ini ada?".
 * 404 adalah jawaban yang jujur: tidak ada pengguna dengan id itu.
 */
function assertNumericId(id) {
  if (!/^\d+$/.test(String(id))) {
    throw ApiError.notFound("Pengguna tidak ditemukan.");
  }
}

async function requireUser(id) {
  assertNumericId(id);
  const user = await userRepo.findById(id);
  if (!user) throw ApiError.notFound("Pengguna tidak ditemukan.");
  return user;
}

// ─── Profil sendiri ──────────────────────────────────────────────────────

export async function getProfile(userId) {
  const user = await userRepo.findById(userId);
  if (!user) throw ApiError.notFound("Pengguna tidak ditemukan.");
  return user;
}

/**
 * Memperbarui profil sendiri — §7.2.
 *
 * Field di luar `name`, `phone`, `avatar`, `profile` diabaikan oleh allowlist
 * di repository. Artinya `{"role": "admin"}` tidak melakukan apa pun, dan
 * mengirimnya juga bukan error — kontrak menuntut keduanya sekaligus.
 */
export async function updateProfile(userId, payload) {
  return userRepo.updateProfile(userId, payload);
}

// ─── Administrasi (admin saja) ───────────────────────────────────────────

export async function list(filters = {}, options = {}) {
  const { page, limit, offset } = paginate(options);
  const total = await userRepo.count(filters);
  const items = await userRepo.findAll(filters, {
    limit,
    offset,
    sortBy: options.sortBy,
    sortDir: options.sortDir,
  });

  return { items, pagination: meta(page, limit, total) };
}

/** Detail pengguna + statistik belajarnya — §7.4. */
export async function getById(id) {
  const user = await requireUser(id);
  const stats = await userRepo.statsFor(id);
  return { user, stats };
}

/**
 * Memperbarui pengguna sebagai admin — §7.5.
 *
 * ── Dua penjaga yang tidak boleh hilang ───────────────────────────────
 *
 * 1. Admin tidak dapat menurunkan peran atau menonaktifkan DIRINYA SENDIRI.
 *    Satu klik salah pada barisnya sendiri di tabel admin akan mengunci orang
 *    itu keluar dari panel yang baru saja ia pakai, tanpa jalan kembali
 *    lewat UI.
 *
 * 2. Admin AKTIF terakhir tidak dapat diturunkan atau dinonaktifkan oleh
 *    siapa pun. Penjaga pertama saja tidak cukup: dengan dua admin, A dapat
 *    menurunkan B, lalu B — yang sekarang bukan admin — tidak dapat
 *    memulihkan A. Sistem berakhir tanpa satu pun admin, dan satu-satunya
 *    pemulihan adalah akses langsung ke database.
 *
 * Perubahan peran atau status juga MENCABUT SELURUH SESI pengguna itu. Tanpa
 * itu, access token lamanya masih membawa klaim `role: "admin"` dan tetap
 * diterima sampai 15 menit ke depan — penurunan peran yang tidak berlaku.
 */
export async function updateByAdmin(id, payload, actor) {
  const target = await requireUser(id);
  const isSelf = String(target.id) === String(actor.id);

  const changingRole = payload.role !== undefined && payload.role !== target.role;
  const deactivating = payload.status !== undefined && payload.status !== "active";

  if (isSelf && changingRole) {
    throw ApiError.validation("Anda tidak dapat mengubah peran akun Anda sendiri.", [
      { field: "role", message: "Peran akun sendiri tidak dapat diubah dari sini." },
    ]);
  }
  if (isSelf && deactivating) {
    throw ApiError.validation("Anda tidak dapat menonaktifkan akun Anda sendiri.", [
      { field: "status", message: "Status akun sendiri tidak dapat diubah dari sini." },
    ]);
  }

  const losingAdmin =
    target.role === "admin" &&
    target.status === "active" &&
    ((changingRole && payload.role !== "admin") || deactivating);

  if (losingAdmin && (await userRepo.countActiveAdmins()) <= 1) {
    throw ApiError.validation(
      "Ini satu-satunya admin aktif yang tersisa. Angkat admin lain terlebih dahulu.",
      [{ field: "role", message: "Sistem harus selalu memiliki minimal satu admin aktif." }],
    );
  }

  const updated = await userRepo.adminUpdate(id, payload);

  if (changingRole || payload.status !== undefined) {
    await tokenService.revokeAllSessions(id);
  }

  return updated;
}

/**
 * Soft delete — §7.6.
 *
 * Sesi ikut dicabut supaya pengguna yang sedang masuk benar-benar keluar.
 * Tanpa itu, access token yang masih hidup tetap diterima hingga 15 menit
 * setelah akunnya dinonaktifkan.
 */
export async function remove(id, actor) {
  const target = await requireUser(id);

  if (String(target.id) === String(actor.id)) {
    throw ApiError.validation("Anda tidak dapat menghapus akun Anda sendiri.", [
      { field: "id", message: "Akun sendiri tidak dapat dihapus dari sini." },
    ]);
  }

  if (
    target.role === "admin" &&
    target.status === "active" &&
    (await userRepo.countActiveAdmins()) <= 1
  ) {
    throw ApiError.validation(
      "Ini satu-satunya admin aktif yang tersisa. Angkat admin lain terlebih dahulu.",
      [{ field: "id", message: "Sistem harus selalu memiliki minimal satu admin aktif." }],
    );
  }

  await userRepo.softDelete(id);
  await tokenService.revokeAllSessions(id);
}
