/**
 * Validator progres belajar.
 *
 * Mengembalikan `Array<{field, message}>` — konsisten dengan validator lain.
 */

const err = (field, message) => ({ field, message });

export const PROGRESS_STATUSES = Object.freeze(["in_progress", "completed"]);

/**
 * PUT /progress/lessons/:lessonId
 *
 * `not_started` sengaja TIDAK diterima. Menandai sesuatu "belum dimulai"
 * bukan sebuah tindakan — itu keadaan awal, dan mengizinkannya membuka jalan
 * pengguna menghapus riwayat penyelesaiannya sendiri secara tidak sengaja.
 */
export function validateUpdateProgress(body = {}, params = {}) {
  const errors = [];

  if (!/^\d+$/.test(String(params.lessonId ?? ""))) {
    errors.push(err("lessonId", "lessonId harus berupa angka."));
  }

  if (body.status === undefined) {
    errors.push(err("status", "status wajib diisi."));
  } else if (!PROGRESS_STATUSES.includes(body.status)) {
    errors.push(err("status", `status harus salah satu dari: ${PROGRESS_STATUSES.join(", ")}.`));
  }

  return errors;
}
