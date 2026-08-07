import { ApiError } from "../utils/ApiError.js";
import { ERROR_CODES } from "../constants/errorCodes.js";

export const ROLES = Object.freeze({ ADMIN: "admin", USER: "user" });

/**
 * Role-Based Access Control.
 *
 * WAJIB dipasang SETELAH `authenticate` — ia membaca `req.user` yang diisi
 * middleware tersebut.
 *
 *   router.get("/", authenticate, requireAdmin, handler)
 *
 * Peran dibaca dari klaim token yang ditandatangani server, bukan dari body
 * atau header yang dikirim klien. Klien tidak dapat mengklaim peran apa pun.
 */
export function authorizeRoles(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user) {
      // Ini kesalahan pemasangan middleware, bukan kesalahan klien —
      // tetapi tetap dibalas 401 agar tidak membocorkan detail internal.
      return next(
        ApiError.unauthorized("Autentikasi diperlukan.", ERROR_CODES.TOKEN_MISSING),
      );
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(ApiError.forbidden("Anda tidak memiliki akses ke sumber daya ini."));
    }

    return next();
  };
}

export const requireAdmin = authorizeRoles(ROLES.ADMIN);

/**
 * Hanya peran `user`.
 *
 * Terlihat aneh sampai kamu melihat alasannya: `POST /quizzes/:id/submit`
 * menolak admin. Admin tidak punya baris `lesson_progress`, jadi mengizinkan
 * mereka mengirim jawaban akan membuat baris `quiz_results` yatim yang
 * merusak seluruh laporan admin (API Contract §4).
 */
export const requireUser = authorizeRoles(ROLES.USER);

/**
 * Mengizinkan akses bila pemanggil adalah pemilik sumber daya ATAU admin.
 *
 * @param {(req) => string} getOwnerId
 */
export function requireSelfOrAdmin(getOwnerId) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(
        ApiError.unauthorized("Autentikasi diperlukan.", ERROR_CODES.TOKEN_MISSING),
      );
    }
    if (req.user.role === ROLES.ADMIN) return next();

    if (String(getOwnerId(req)) === String(req.user.id)) return next();

    // Sengaja 403, bukan 404. Membedakan "tidak ada" dari "bukan milikmu"
    // di sini tidak membocorkan apa pun karena penyerang sudah tahu id yang
    // ia kirim; 404 justru akan menyesatkan pemilik sah yang salah klik.
    return next(ApiError.forbidden("Anda hanya dapat mengakses data milik sendiri."));
  };
}
