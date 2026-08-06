import { env } from "./env.js";

/**
 * Opsi cookie refresh token — sumber kebenaran tunggal.
 *
 * Dipusatkan karena `set` dan `clear` HARUS memakai atribut yang sama persis.
 * Browser mencocokkan cookie berdasarkan (name, domain, path); kalau `clearCookie`
 * memakai path berbeda dari `cookie`, cookie lama TIDAK terhapus dan pengguna
 * tetap "login" setelah menekan logout. Bug ini sering lolos ke produksi karena
 * di localhost path-nya kebetulan sama.
 */

/**
 * Cookie dibatasi ke path endpoint auth.
 *
 * Konsekuensinya refresh token TIDAK ikut terkirim pada request biasa seperti
 * `GET /api/v1/courses`. Permukaan paparannya menyusut drastis: token hanya
 * melintas kabel ketika benar-benar dibutuhkan.
 */
export const REFRESH_COOKIE_PATH = `${env.apiPrefix}/auth`;

function baseOptions() {
  return {
    // Tidak dapat dibaca JavaScript. Inilah yang membuat XSS tidak lagi
    // berarti pencurian sesi.
    httpOnly: true,

    // Hanya dikirim lewat HTTPS.
    secure: env.cookie.secure,

    // 'strict' di produksi: cookie tidak ikut pada navigasi lintas situs,
    // yang menutup CSRF pada endpoint refresh tanpa perlu token CSRF terpisah.
    sameSite: env.cookie.sameSite,

    path: REFRESH_COOKIE_PATH,
    domain: env.cookie.domain,
  };
}

export function refreshCookieOptions() {
  return {
    ...baseOptions(),
    maxAge: env.refreshToken.ttlDays * 24 * 60 * 60 * 1000,
  };
}

/** Atribut identik dengan set, tanpa maxAge — syarat agar penghapusan berhasil. */
export function clearRefreshCookieOptions() {
  return baseOptions();
}

export const REFRESH_COOKIE_NAME = env.refreshToken.cookieName;
