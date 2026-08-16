/**
 * Estimasi durasi hanya ditampilkan bila memang diketahui.
 *
 * Katalog kursus sengaja menyimpan 0 untuk kursus berbasis video: durasi asli
 * tidak dapat diambil tanpa API key YouTube, dan menampilkan angka karangan
 * kepada orang yang memakainya untuk merencanakan waktu belajar lebih buruk
 * daripada tidak menampilkan apa pun.
 */
export function formatEstimatedHours(hours) {
  const value = Number(hours);
  return Number.isFinite(value) && value > 0 ? `${value} jam` : null;
}
