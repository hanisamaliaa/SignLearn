import { ApiError } from "../utils/ApiError.js";
import { ERROR_CODES } from "../constants/errorCodes.js";
import { verifyAccessToken } from "../services/tokenService.js";

/**
 * Ekstrak Bearer token dari header Authorization.
 * @returns {string|null}
 */
function extractBearer(req) {
  const header = req.headers.authorization;
  if (!header || typeof header !== "string") return null;

  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return null;

  return token.trim() || null;
}

/**
 * Memverifikasi access token dan mengisi `req.user`.
 *
 * `req.user` berisi klaim token saja — id, email, role. Ia TIDAK berisi baris
 * database. Handler yang butuh data terkini (mis. status akun) harus membaca
 * dari repository, karena token diterbitkan hingga 15 menit sebelumnya dan
 * bisa saja akun sudah di-suspend sejak itu.
 */
export function authenticate(req, _res, next) {
  const token = extractBearer(req);

  if (!token) {
    return next(
      ApiError.unauthorized(
        "Token autentikasi diperlukan.",
        ERROR_CODES.TOKEN_MISSING,
      ),
    );
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: String(payload.sub),
      email: payload.email,
      role: payload.role,
    };
    return next();
  } catch (err) {
    // Dinormalisasi errorHandler menjadi TOKEN_EXPIRED atau TOKEN_INVALID.
    // Perbedaannya penting: TOKEN_EXPIRED memberi tahu klien untuk mencoba
    // refresh, sedangkan TOKEN_INVALID berarti sesi harus dibuang.
    return next(err);
  }
}

/**
 * Mengisi `req.user` bila token valid ada, tetapi tidak menolak bila tidak ada.
 *
 * Dipakai endpoint yang berperilaku berbeda untuk tamu — misalnya `/courses`
 * yang menyertakan progres hanya bila pengguna sudah masuk.
 */
export function optionalAuthenticate(req, _res, next) {
  const token = extractBearer(req);
  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: String(payload.sub),
      email: payload.email,
      role: payload.role,
    };
  } catch (error) {
    // Tanpa token berarti tamu; token yang DIKIRIM tetapi rusak/kedaluwarsa
    // tetap 401. Ini penting bagi klien admin: respons 401 memicu rotasi access
    // token, sedangkan respons 200 sebagai tamu diam-diam menyembunyikan entri
    // inactive dan membuat dashboard tampak rusak setelah 15 menit.
    return next(error);
  }

  return next();
}
