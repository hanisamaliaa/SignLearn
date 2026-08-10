import { ApiError } from "../utils/ApiError.js";
import { env } from "../config/env.js";
import { ERROR_CODES, STATUS_TO_CODE } from "../constants/errorCodes.js";

/** 404 untuk rute yang tidak cocok. */
export function notFoundHandler(req, _res, next) {
  next(
    new ApiError(404, `Rute tidak ditemukan: ${req.method} ${req.originalUrl}`, {
      code: ERROR_CODES.NOT_FOUND,
    }),
  );
}

/**
 * Menerjemahkan error dari driver dan library menjadi ApiError.
 *
 * Dipisahkan agar handler utama tetap pendek dan agar penambahan penerjemahan
 * baru tidak menyentuh logika respons.
 */
function normalize(err) {
  if (err instanceof ApiError) return err;

  // ── jsonwebtoken ────────────────────────────────────────────────────
  if (err.name === "TokenExpiredError") {
    return ApiError.unauthorized("Token sudah kedaluwarsa.", ERROR_CODES.TOKEN_EXPIRED);
  }
  if (err.name === "JsonWebTokenError" || err.name === "NotBeforeError") {
    return ApiError.unauthorized("Token tidak valid.", ERROR_CODES.TOKEN_INVALID);
  }

  // ── PostgreSQL (kode SQLSTATE) ──────────────────────────────────────
  switch (err.code) {
    case "23505": // unique_violation
      return ApiError.conflict("Data sudah ada — duplikat terdeteksi.");
    case "23503": // foreign_key_violation
      return ApiError.validation("Referensi data tidak valid.", [
        { field: "id", message: "Data yang dirujuk tidak ditemukan." },
      ]);
    case "23514": // check_violation
      return ApiError.validation("Nilai yang dikirim di luar rentang yang diizinkan.");
    case "22P02": // invalid_text_representation
      return ApiError.validation("Format parameter tidak valid.");
    case "22001": // string_data_right_truncation
      // Nilai lebih panjang daripada lebar kolom. Ini SELALU kesalahan input,
      // jadi 500 adalah jawaban yang salah — tetapi juga tanda validator untuk
      // field itu belum memeriksa panjangnya. Pesan di sini sengaja umum
      // karena SQLSTATE tidak memberi tahu kolom mana yang meluap.
      return ApiError.validation("Salah satu nilai yang dikirim terlalu panjang.");
    case "22003": // numeric_value_out_of_range
      return ApiError.validation("Salah satu nilai angka di luar jangkauan yang diizinkan.");
    case "ECONNREFUSED":
    case "ETIMEDOUT":
      return new ApiError(503, "Layanan database sedang tidak tersedia.", {
        code: ERROR_CODES.INTERNAL,
      });
    default:
      break;
  }

  // ── body-parser ─────────────────────────────────────────────────────
  if (err.type === "entity.too.large") {
    return new ApiError(413, "Ukuran data melebihi batas.", {
      code: ERROR_CODES.PAYLOAD_TOO_LARGE,
    });
  }
  if (err.type === "entity.parse.failed") {
    return ApiError.badRequest("Body request bukan JSON yang valid.");
  }

  const status = err.status || err.statusCode || 500;
  return new ApiError(status, err.message || "Terjadi kesalahan pada server.", {
    code: STATUS_TO_CODE[status] ?? ERROR_CODES.INTERNAL,
  });
}

/** Handler error terpusat. Seluruh error berakhir di sini. */
export function errorHandler(err, req, res, _next) {
  const apiError = normalize(err);
  const { status, code, message, errors } = apiError;

  // 5xx dicatat lengkap — ini kegagalan kita, bukan kesalahan klien.
  // 4xx tidak dicatat agar log tidak dibanjiri percobaan login yang gagal.
  if (status >= 500) {
    console.error(
      `[error] ${req.method} ${req.originalUrl} → ${status} ${code}: ${message}`,
      err.stack,
    );
  }

  const body = { success: false, status, code, message };
  if (errors?.length) body.errors = errors;

  // Stack trace TIDAK PERNAH keluar di produksi. Ia membocorkan struktur
  // direktori, versi dependensi, dan sering kali potongan query.
  if (!env.isProduction && status >= 500) {
    body.stack = err.stack;
  }

  return res.status(status).json(body);
}
