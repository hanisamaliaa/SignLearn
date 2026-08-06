import { ERROR_CODES, STATUS_TO_CODE } from "../constants/errorCodes.js";

/**
 * Error API dengan status HTTP, kode stabil, dan detail per field.
 *
 * `code` yang dibaca frontend; `message` untuk manusia dan boleh berubah
 * kapan saja tanpa memecahkan klien.
 */
export class ApiError extends Error {
  /**
   * @param {number} status  HTTP status
   * @param {string} message Pesan untuk manusia (Bahasa Indonesia)
   * @param {object} [opts]
   * @param {string} [opts.code]    Kode stabil dari ERROR_CODES
   * @param {Array<{field:string,message:string}>} [opts.errors] Detail per field
   */
  constructor(status, message, { code, errors } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code ?? STATUS_TO_CODE[status] ?? ERROR_CODES.INTERNAL;
    if (errors?.length) this.errors = errors;

    // Buang frame konstruktor dari stack agar menunjuk ke tempat lempar aslinya.
    Error.captureStackTrace?.(this, ApiError);
  }

  // ─── Factory ─────────────────────────────────────────────────────────
  // Dipakai agar call site membaca seperti kalimat dan status/kode tidak
  // pernah tertukar pasangannya.

  static badRequest(message, errors) {
    return new ApiError(400, message, { code: ERROR_CODES.VALIDATION_FAILED, errors });
  }

  static validation(message = "Data yang dikirim tidak valid.", errors) {
    return new ApiError(422, message, { code: ERROR_CODES.VALIDATION_FAILED, errors });
  }

  static unauthorized(message = "Autentikasi diperlukan.", code = ERROR_CODES.TOKEN_INVALID) {
    return new ApiError(401, message, { code });
  }

  static forbidden(
    message = "Anda tidak memiliki akses ke sumber daya ini.",
    code = ERROR_CODES.FORBIDDEN,
  ) {
    return new ApiError(403, message, { code });
  }

  static notFound(message = "Sumber daya tidak ditemukan.") {
    return new ApiError(404, message, { code: ERROR_CODES.NOT_FOUND });
  }

  static conflict(message, code = ERROR_CODES.DUPLICATE_ENTRY) {
    return new ApiError(409, message, { code });
  }

  static tooManyRequests(message = "Terlalu banyak permintaan. Coba lagi nanti.") {
    return new ApiError(429, message, { code: ERROR_CODES.RATE_LIMITED });
  }

  static notImplemented(message = "Fitur ini belum tersedia.") {
    return new ApiError(501, message, { code: ERROR_CODES.NOT_IMPLEMENTED });
  }
}
