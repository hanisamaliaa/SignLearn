import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";
import { ERROR_CODES } from "../constants/errorCodes.js";

/**
 * Rate limiter.
 *
 * Limit global saja tidak cukup. 100 request / 15 menit membiarkan penyerang
 * mencoba 100 kata sandi pada satu akun — lebih dari cukup untuk menembus
 * sandi lemah. Endpoint auth butuh batas yang jauh lebih ketat.
 */

/** Respons seragam mengikuti envelope error API Contract §2.3. */
function limitHandler(message) {
  return (req, res) => {
    res.status(429).json({
      success: false,
      status: 429,
      code: ERROR_CODES.RATE_LIMITED,
      message,
    });
  };
}

function make({ windowMs, max, message, keyGenerator, skipSuccessfulRequests = false }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    keyGenerator,
    handler: limitHandler(message),
    // Nonaktif saat test agar suite tidak saling mengganggu.
    skip: () => env.isTest,
  });
}

/** Batas global untuk seluruh API. */
export const globalLimiter = make({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.max,
  message: "Terlalu banyak permintaan. Coba lagi beberapa saat lagi.",
});

/**
 * Login: 5 percobaan / 15 menit per IP.
 *
 * `skipSuccessfulRequests` membuat login yang berhasil tidak ikut dihitung —
 * pengguna sah yang login berkali-kali dari kantor bersama tidak terkena
 * batas, sementara penyerang yang selalu gagal tetap terkena.
 */
export const loginLimiter = make({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  message: "Terlalu banyak percobaan masuk. Coba lagi dalam 15 menit.",
});

/**
 * Login per-EMAIL, bukan per-IP.
 *
 * Ini yang menutup serangan terdistribusi: penyerang dengan 1.000 IP proxy
 * lolos dari limiter per-IP sepenuhnya, tetapi tetap terkunci di sini karena
 * seluruh percobaannya menargetkan satu email yang sama.
 *
 * Dipasang berdampingan dengan `loginLimiter`, bukan menggantikannya.
 */
export const loginEmailLimiter = make({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const email = String(req.body?.email || "").toLowerCase().trim();
    if (email) return `email:${email}`;

    // Tanpa email (body kosong atau rusak) jatuh kembali ke IP.
    // IPv6 dipersempit ke /64 karena satu pelanggan biasanya mendapat blok
    // sebesar itu — tanpa penyempitan, penyerang cukup berpindah alamat di
    // dalam bloknya sendiri untuk mengulang percobaan tanpa batas.
    const ip = req.ip || "unknown";
    return ip.includes(":") ? `ip:${ip.split(":").slice(0, 4).join(":")}::/64` : `ip:${ip}`;
  },
  message: "Terlalu banyak percobaan masuk untuk akun ini. Coba lagi dalam 15 menit.",
});

export const registerLimiter = make({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: "Terlalu banyak pendaftaran dari perangkat ini. Coba lagi dalam 1 jam.",
});

export const emailVerificationLimiter = make({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => {
    const email = String(req.body?.email || "").toLowerCase().trim();
    return email ? `verify:${email}` : `verify-ip:${req.ip || "unknown"}`;
  },
  message: "Terlalu banyak percobaan verifikasi. Minta kode baru dalam 15 menit.",
});

export const emailVerificationResendLimiter = make({
  windowMs: 60 * 60 * 1000,
  max: 3,
  keyGenerator: (req) => {
    const email = String(req.body?.email || "").toLowerCase().trim();
    return email ? `verify-resend:${email}` : `verify-resend-ip:${req.ip || "unknown"}`;
  },
  message: "Terlalu banyak permintaan kode verifikasi. Coba lagi dalam 1 jam.",
});

export const paymentCheckoutLimiter = make({
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => `checkout:${req.user?.id ?? req.ip ?? "unknown"}`,
  message: "Terlalu banyak transaksi dibuat. Coba lagi dalam 1 jam.",
});

/**
 * Forgot password: batas ketat.
 *
 * Endpoint ini mengirim email atas permintaan siapa pun yang menekannya.
 * Tanpa batas, ia menjadi alat spam gratis yang memakai domain kita.
 */
export const forgotPasswordLimiter = make({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: "Terlalu banyak permintaan reset kata sandi. Coba lagi dalam 1 jam.",
});

/**
 * Lupa kata sandi per-EMAIL.
 *
 * Pembatas per-IP saja tidak melindungi kotak masuk siapa pun: penyerang
 * dengan sekumpulan proxy dapat membanjiri satu orang dengan email reset
 * sampai ia menyerah memakai layanannya.
 */
export const forgotPasswordEmailLimiter = make({
  windowMs: 60 * 60 * 1000,
  max: 3,
  keyGenerator: (req) => {
    const email = String(req.body?.email || "").toLowerCase().trim();
    return email ? `forgot:${email}` : `forgot-ip:${req.ip || "unknown"}`;
  },
  message: "Terlalu banyak permintaan reset untuk email ini. Coba lagi dalam 1 jam.",
});

export const refreshLimiter = make({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: "Terlalu banyak permintaan penyegaran sesi.",
});

/** Upload gambar mahal dalam bandwidth dan transformasi; batasi per akun. */
export const imageUploadLimiter = make({
  windowMs: 15 * 60 * 1000,
  max: 30,
  // Middleware ini selalu dipasang setelah `authenticate`, jadi id tersedia
  // dan tidak memerlukan parsing IPv6 khusus milik limiter berbasis IP.
  keyGenerator: (req) => `upload:${req.user.id}`,
  message: "Terlalu banyak upload gambar. Coba lagi dalam 15 menit.",
});
