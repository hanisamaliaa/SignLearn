import { request } from "./api";

/** Dashboard admin, laporan, feed aktivitas — API Contract §10.4-10.6. */

export async function getAdminDashboard() {
  return request({ url: "/dashboard/admin" });
}

/**
 * `from` dan `to` WAJIB `YYYY-MM-DD`, rentang maksimal 365 hari. Tanpa
 * keduanya server menolak 422 — penjaga agar halaman admin tidak memicu
 * pemindaian seluruh tabel setiap dibuka.
 */
export async function getAdminReports({ from, to, groupBy = "day" }) {
  return request({ url: "/dashboard/admin/reports", params: { from, to, groupBy } });
}

export async function getStats() {
  const payload = await request({ url: "/admin/stats" });
  return payload.totals;
}

export async function getActivities(params = {}) {
  return request({ url: "/admin/activities", params });
}

/**
 * Hasil kuis seluruh pengguna — lulus MAUPUN gagal.
 *
 * Jangan menggantinya dengan `getActivities({ type: "quiz_passed" })`: feed
 * aktivitas hanya memuat yang lulus, sehingga distribusi nilai yang dibangun
 * darinya tidak akan pernah menampilkan satu pun kegagalan.
 *
 * Semua filter opsional: `from`, `to` (YYYY-MM-DD), `courseId`, `passed`.
 * `summary` dihitung server atas seluruh baris yang cocok, bukan atas halaman
 * yang sedang tampil.
 */
export async function getQuizResults(params = {}) {
  return request({ url: "/admin/quiz-results", params });
}
