/**
 * Paginasi — satu sumber kebenaran (API Contract §2.7).
 *
 * Fungsi ini sebelumnya disalin identik ke courseService, lessonService, dan
 * quizService. Modul users, dashboard, dan admin akan membutuhkannya juga,
 * sehingga salinannya menjadi enam. Enam salinan berarti perbaikan pada satu
 * berkas diam-diam tidak berlaku di lima berkas lain — dan paginasi yang
 * berbeda-beda antar-endpoint adalah bug yang sangat sulit dilihat karena
 * setiap endpoint terlihat benar ketika dibaca sendirian.
 */

export const MAX_LIMIT = 100;
export const DEFAULT_LIMIT = 20;

/**
 * Menormalkan `page` dan `limit` dari query string.
 *
 * Nilai di luar jangkauan DIJEPIT, bukan ditolak. `?limit=9999` adalah
 * permintaan yang masuk akal dari klien yang ingin "semuanya"; membalas 422
 * hanya membuat frontend menebak-nebak batasnya. Menjepit ke 100 memberi
 * jawaban yang berguna sekaligus melindungi database.
 *
 * @returns {{page: number, limit: number, offset: number}}
 */
export function paginate({ page = 1, limit = DEFAULT_LIMIT } = {}) {
  const p = Math.max(1, Math.floor(Number(page)) || 1);
  const l = Math.min(MAX_LIMIT, Math.max(1, Math.floor(Number(limit)) || DEFAULT_LIMIT));
  return { page: p, limit: l, offset: (p - 1) * l };
}

/**
 * Metadata paginasi untuk respons.
 *
 * `hasNext` dihitung dari `totalPages`, bukan dari `items.length === limit`.
 * Cara kedua salah tepat di halaman terakhir yang kebetulan penuh: klien
 * melihat `hasNext: true`, meminta halaman berikutnya, dan menerima daftar
 * kosong.
 */
export function meta(page, limit, total) {
  const totalPages = Math.ceil(total / limit) || 0;
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}
