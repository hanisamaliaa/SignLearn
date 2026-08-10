import * as adminRepo from "../repositories/adminRepository.js";
import * as dashboardRepo from "../repositories/dashboardRepository.js";
import { paginate, meta } from "../utils/pagination.js";

/**
 * Admin service — statistik ringkas dan feed aktivitas (API Contract §10.6).
 *
 * Manajemen pengguna TIDAK ada di sini. Ia hidup di `userService` dan
 * terekspos lewat `/users/**`, satu permukaan saja. Menyediakannya di
 * `/admin/users` juga berarti dua tempat memasang validasi dan penjaga peran,
 * dan yang terlupa menjadi lubang yang tidak terlihat sampai dimanfaatkan.
 */

/**
 * `GET /admin/stats` — §10.6.
 *
 * Kontrak menyebut bentuknya "sama dengan /dashboard/admin.totals", jadi ia
 * memanggil repository yang sama. Menyalin query-nya akan membuat dua endpoint
 * yang menjanjikan angka identik perlahan menjawab berbeda.
 */
export async function getStats() {
  const totals = await dashboardRepo.adminTotals();
  return { totals };
}

/** `GET /admin/activities` — §10.6. */
export async function getRecentActivities(filters = {}, options = {}) {
  const { page, limit, offset } = paginate(options);

  const total = await adminRepo.countActivities(filters);
  const items = await adminRepo.findActivities(filters, { limit, offset });

  return { items, pagination: meta(page, limit, total) };
}
