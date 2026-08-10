import * as dashboardRepo from "../repositories/dashboardRepository.js";
import * as userRepo from "../repositories/userRepository.js";
import * as progressService from "./progressService.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * Dashboard service — API Contract §10.3-10.5.
 */

/**
 * Dashboard pembelajar — §10.3.
 *
 * `summary` diambil dari `progressService`, BUKAN dihitung ulang di sini.
 * Kontrak menyebutnya "sama dengan /progress summary", dan satu-satunya cara
 * menjamin kalimat itu tetap benar adalah memakai kode yang sama. Dua
 * perhitungan paralel akan menyimpang pada perubahan pertama, lalu halaman
 * depan dan halaman progres menampilkan dua angka berbeda untuk satu orang.
 *
 * Blok `user` sengaja ringkas — hanya id, nama, avatar. Dashboard tidak
 * membutuhkan email atau peran, dan field yang tidak dibutuhkan tetap dapat
 * bocor ke log, cache, atau ekstensi browser.
 */
export async function getUserDashboard(userId) {
  const user = await userRepo.findById(userId);
  if (!user) throw ApiError.notFound("Pengguna tidak ditemukan.");

  const [progress, continueLearning, recentQuizzes] = await Promise.all([
    progressService.getUserProgress(userId),
    dashboardRepo.continueLearning(userId),
    dashboardRepo.recentQuizzes(userId),
  ]);

  return {
    user: { id: user.id, name: user.name, avatar: user.avatar },
    summary: progress.summary,
    continueLearning,
    recentQuizzes,
    badges: progress.badges,

    /**
     * Kontrak §10.3 mencantumkan blok `practice`, tetapi skema belum punya
     * tabel sesi latihan dan endpoint §10.9-10.10 belum ada. Nilainya `null`,
     * bukan angka nol palsu: nol berarti "sudah diukur, hasilnya kosong",
     * sedangkan yang benar di sini adalah "belum diukur sama sekali".
     * Frontend menyembunyikan kartunya ketika null.
     */
    practice: null,
  };
}

/** Dashboard admin — §10.4. */
export async function getAdminDashboard() {
  const [totals, trends] = await Promise.all([
    dashboardRepo.adminTotals(),
    dashboardRepo.adminTrends(),
  ]);

  return { totals, growth: trends.growth, engagement: trends.engagement };
}

/**
 * Laporan admin — §10.5.
 *
 * Rentang sudah divalidasi router (`validateReportQuery`): tanggal sah,
 * `from <= to`, dan lebar maksimal 365 hari. Service mempercayainya dan tidak
 * memvalidasi ulang — dua pemeriksaan yang perlahan menyimpang lebih buruk
 * daripada satu pemeriksaan yang jelas letaknya.
 */
export async function getAdminReports({ from, to, groupBy = "day" }) {
  const [series, topCourses] = await Promise.all([
    dashboardRepo.reportSeries(from, to, groupBy),
    dashboardRepo.topCourses(from, to),
  ]);

  return { range: { from, to, groupBy }, series, topCourses };
}
