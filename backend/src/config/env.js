import dotenv from "dotenv";
import crypto from "node:crypto";

dotenv.config();

/**
 * Konfigurasi tervalidasi, gagal-cepat.
 *
 * Prinsip: proses MENOLAK START bila konfigurasi produksi tidak aman.
 * Secret yang salah tidak boleh menjadi bug runtime yang ditemukan pengguna;
 * ia harus menjadi crash saat deploy, ketika masih murah diperbaiki.
 */

const isProduction = process.env.NODE_ENV === "production";

const num = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const bool = (value, fallback = false) =>
  typeof value === "string"
    ? ["true", "1", "yes", "on"].includes(value.toLowerCase())
    : fallback;

const list = (value) =>
  (value || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

// ─── Validasi ──────────────────────────────────────────────────────────
const errors = [];
const warnings = [];

const DEV_SECRET_FALLBACK = "dev-only-insecure-secret-do-not-use-in-production";

/**
 * Secret JWT minimal 32 karakter.
 *
 * HS256 memakai secret sebagai kunci HMAC. Secret pendek dapat di-brute-force
 * offline dari satu token yang tertangkap — penyerang lalu dapat menandatangani
 * token apa pun, termasuk `role: "admin"`.
 */
function readSecret(key, envValue) {
  if (envValue) {
    if (envValue.length < 32) {
      errors.push(
        `${key} terlalu pendek (${envValue.length} karakter, minimal 32).`,
      );
    }
    if (envValue === DEV_SECRET_FALLBACK) {
      errors.push(
        `${key} masih memakai nilai contoh. Ganti dengan secret acak.`,
      );
    }
    return envValue;
  }

  if (isProduction) {
    errors.push(`${key} wajib diisi di produksi.`);
    return "";
  }

  warnings.push(
    `${key} tidak diatur — memakai secret acak sementara. Sesi akan hilang saat restart.`,
  );
  return crypto.randomBytes(48).toString("hex");
}

const accessSecret = readSecret(
  "JWT_ACCESS_SECRET",
  process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET,
);

if (isProduction && !process.env.DATABASE_URL) {
  errors.push(
    "DATABASE_URL wajib diisi di produksi — backend tidak dapat berjalan tanpa database.",
  );
}

const corsOrigins = list(process.env.CORS_ORIGINS);
if (isProduction && corsOrigins.length === 0) {
  errors.push(
    "CORS_ORIGINS wajib diisi di produksi — cookie kredensial menolak origin wildcard.",
  );
}

// ─── Konfigurasi ───────────────────────────────────────────────────────
export const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV || "development",
  isProduction,
  isTest: process.env.NODE_ENV === "test",
  port: num(process.env.PORT, 4000),
  apiPrefix: process.env.API_PREFIX || "/api/v1",

  database: {
    url: process.env.DATABASE_URL,
    poolMax: num(process.env.DB_POOL_MAX, 10),
    // Supabase memakai sertifikat yang tidak ada di trust store Node.
    // Di produksi sebaiknya sediakan CA lewat DB_SSL_CA daripada mematikannya.
    ssl: bool(process.env.DB_SSL, true),
    sslRejectUnauthorized: bool(process.env.DB_SSL_REJECT_UNAUTHORIZED, false),
  },

  jwt: {
    accessSecret,
    // 15 menit. Cukup pendek sehingga token curian cepat basi, cukup panjang
    // sehingga refresh tidak terjadi tiap beberapa request.
    accessTtlSeconds: num(process.env.JWT_ACCESS_TTL_SECONDS, 15 * 60),
    issuer: process.env.JWT_ISSUER || "signlearn",
    audience: process.env.JWT_AUDIENCE || "signlearn-web",
  },

  refreshToken: {
    // 7 hari. Opaque, stateful, disimpan sebagai hash — bukan JWT.
    ttlDays: num(process.env.REFRESH_TTL_DAYS, 7),
    cookieName: process.env.REFRESH_COOKIE_NAME || "slr_rt",
    bytes: 48,
  },

  cookie: {
    // Wajib true di produksi: tanpa Secure, cookie ikut terkirim lewat HTTP polos.
    secure: bool(process.env.COOKIE_SECURE, isProduction),
    sameSite: process.env.COOKIE_SAME_SITE || (isProduction ? "strict" : "lax"),
    domain: process.env.COOKIE_DOMAIN || undefined,
  },

  security: {
    // 12 rounds ≈ 250 ms di perangkat 2026. 10 sudah terlalu murah untuk GPU modern.
    bcryptRounds: num(process.env.BCRYPT_ROUNDS, 12),
    maxFailedLogins: num(process.env.MAX_FAILED_LOGINS, 5),
    lockoutMinutes: num(process.env.LOCKOUT_MINUTES, 15),
    passwordResetTtlMinutes: num(process.env.PASSWORD_RESET_TTL_MINUTES, 30),
  },

  corsOrigins,

  rateLimit: {
    windowMs: num(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    max: num(process.env.RATE_LIMIT_MAX, 100),
  },
});

// ─── Laporkan ──────────────────────────────────────────────────────────
for (const w of warnings) console.warn(`[config] ${w}`);

if (errors.length > 0) {
  console.error("\n[config] Konfigurasi tidak valid — proses dihentikan:\n");
  for (const e of errors) console.error(`  ✗ ${e}`);
  console.error("\nLihat .env.example untuk daftar lengkap.\n");
  process.exit(1);
}
