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

/**
 * Membaca angka dari environment.
 *
 * ── Kenapa nilai KOSONG diperlakukan sebagai tidak ada ────────────────
 *
 * Versi sebelumnya hanya menulis `Number.isFinite(Number(value))`. Masalahnya
 * `Number("")` bernilai **0**, dan `Number.isFinite(0)` bernilai **true** —
 * sehingga baris `PORT=` tanpa nilai LOLOS sebagai angka nol, bukan jatuh ke
 * default.
 *
 * Kunci yang ada tetapi nilainya kosong sangat lumrah: seseorang menghapus
 * nilainya dan lupa menghapus barisnya. Akibatnya senyap dan beragam:
 *
 *     PORT=                    → server bind ke port ACAK pilihan OS, dan
 *                                frontend melapor "tidak dapat terhubung ke
 *                                server" padahal backend-nya berjalan
 *     BCRYPT_ROUNDS=           → bcrypt 0 putaran
 *     MAX_FAILED_LOGINS=       → akun terkunci pada percobaan pertama
 *     JWT_ACCESS_TTL_SECONDS=  → token kedaluwarsa saat diterbitkan
 *
 * Tidak satu pun melempar error. Semuanya "berhasil" dengan nilai nol.
 */
const num = (value, fallback) => {
  if (value === undefined || value === null || String(value).trim() === "") {
    return fallback;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

/**
 * Port TCP yang sah: 1-65535.
 *
 * Port 0 sah secara teknis — ia menyuruh OS memilih port acak — tetapi hampir
 * tidak pernah disengaja di berkas `.env`, dan akibatnya persis sama dengan
 * nilai kosong: tidak ada yang tahu server mendengarkan di mana.
 */
const port = (value, fallback) => {
  const n = num(value, fallback);
  return Number.isInteger(n) && n >= 1 && n <= 65535 ? n : fallback;
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

if (!process.env.DATABASE_URL) {
  errors.push(
    "DATABASE_URL wajib diisi — backend tidak dapat berjalan tanpa database PostgreSQL.",
  );
}

const corsOrigins = list(process.env.CORS_ORIGINS);
if (isProduction && corsOrigins.length === 0) {
  errors.push(
    "CORS_ORIGINS wajib diisi di produksi — cookie kredensial menolak origin wildcard.",
  );
}

const cloudinaryCredentials = [
  process.env.CLOUDINARY_CLOUD_NAME,
  process.env.CLOUDINARY_API_KEY,
  process.env.CLOUDINARY_API_SECRET,
].filter((value) => Boolean(value?.trim()));
const cloudinaryFolder = (process.env.CLOUDINARY_FOLDER || "signlearn")
  .trim()
  .replace(/[^a-zA-Z0-9/_-]/g, "")
  .replace(/\/{2,}/g, "/")
  .replace(/^\/+|\/+$/g, "");

if (cloudinaryCredentials.length > 0 && cloudinaryCredentials.length < 3) {
  errors.push(
    "Konfigurasi Cloudinary tidak lengkap. CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, dan CLOUDINARY_API_SECRET harus diisi bersama.",
  );
}
if (isProduction && cloudinaryCredentials.length !== 3) {
  errors.push("Kredensial Cloudinary wajib diisi di produksi agar upload gambar tersedia.");
}
if (!/[a-zA-Z0-9]/.test(cloudinaryFolder)) {
  errors.push("CLOUDINARY_FOLDER harus memuat minimal satu huruf atau angka.");
}

const imageMaxBytes = num(process.env.UPLOAD_IMAGE_MAX_BYTES, 5 * 1024 * 1024);
if (!Number.isInteger(imageMaxBytes) || imageMaxBytes < 1024) {
  errors.push("UPLOAD_IMAGE_MAX_BYTES harus berupa bilangan bulat minimal 1024 byte.");
}

const paymentProvider = (
  process.env.PAYMENT_PROVIDER || (process.env.MIDTRANS_SERVER_KEY ? "midtrans" : "mock")
).trim().toLowerCase();
if (!["mock", "midtrans"].includes(paymentProvider)) {
  errors.push("PAYMENT_PROVIDER harus bernilai mock atau midtrans.");
}
const mockPaymentsEnabled = bool(process.env.ALLOW_MOCK_PAYMENTS, !isProduction);
if (paymentProvider === "midtrans" && isProduction && !process.env.MIDTRANS_SERVER_KEY) {
  errors.push("MIDTRANS_SERVER_KEY wajib diisi ketika PAYMENT_PROVIDER=midtrans di produksi.");
}
if (paymentProvider === "mock" && isProduction && !mockPaymentsEnabled) {
  warnings.push(
    "Checkout mock nonaktif di produksi. Isi gateway nyata atau setel ALLOW_MOCK_PAYMENTS=true hanya untuk deployment demo.",
  );
}

const emailVerificationEnabled = bool(process.env.EMAIL_VERIFICATION_ENABLED, true);
const emailVerificationTtlMinutes = num(process.env.EMAIL_VERIFICATION_TTL_MINUTES, 15);
const emailVerificationMaxAttempts = num(process.env.EMAIL_VERIFICATION_MAX_ATTEMPTS, 5);
const emailVerificationResendCooldownSeconds = num(
  process.env.EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS,
  60,
);
if (
  !Number.isInteger(emailVerificationTtlMinutes) ||
  emailVerificationTtlMinutes < 5 ||
  emailVerificationTtlMinutes > 60
) {
  errors.push("EMAIL_VERIFICATION_TTL_MINUTES harus bilangan bulat antara 5 dan 60.");
}
if (
  !Number.isInteger(emailVerificationMaxAttempts) ||
  emailVerificationMaxAttempts < 3 ||
  emailVerificationMaxAttempts > 10
) {
  errors.push("EMAIL_VERIFICATION_MAX_ATTEMPTS harus bilangan bulat antara 3 dan 10.");
}
if (
  !Number.isInteger(emailVerificationResendCooldownSeconds) ||
  emailVerificationResendCooldownSeconds < 30 ||
  emailVerificationResendCooldownSeconds > 3600
) {
  errors.push(
    "EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS harus bilangan bulat antara 30 dan 3600.",
  );
}
if (isProduction && emailVerificationEnabled && !process.env.SMTP_HOST) {
  errors.push("SMTP_HOST wajib diisi di produksi ketika verifikasi email registrasi aktif.");
}

// ─── Konfigurasi ───────────────────────────────────────────────────────
export const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV || "development",
  isProduction,
  isTest: process.env.NODE_ENV === "test",
  port: port(process.env.PORT, 4000),
  apiPrefix: process.env.API_PREFIX || "/api/v1",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:4789",
  midtrans: {
    serverKey: process.env.MIDTRANS_SERVER_KEY || "",
    isProduction: bool(process.env.MIDTRANS_IS_PRODUCTION, false),
  },
  payment: {
    provider: paymentProvider,
    mockEnabled: paymentProvider === "mock" && mockPaymentsEnabled,
  },

  cloudinary: {
    enabled: cloudinaryCredentials.length === 3,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME?.trim() || "",
    apiKey: process.env.CLOUDINARY_API_KEY?.trim() || "",
    apiSecret: process.env.CLOUDINARY_API_SECRET?.trim() || "",
    folder: cloudinaryFolder,
  },

  upload: {
    imageMaxBytes,
  },

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
    // 15 menit, bukan 30. Kode enam digit hanya punya sejuta kemungkinan;
    // memperpendek jendelanya adalah separuh dari pertahanan terhadap tebakan
    // (separuh lainnya: batas percobaan di bawah).
    passwordResetTtlMinutes: num(process.env.PASSWORD_RESET_TTL_MINUTES, 15),
    // Kode dibakar setelah sekian tebakan salah.
    passwordResetMaxAttempts: num(process.env.PASSWORD_RESET_MAX_ATTEMPTS, 5),
    emailVerificationEnabled,
    emailVerificationTtlMinutes,
    emailVerificationMaxAttempts,
    emailVerificationResendCooldownSeconds,
  },

  /**
   * Pengiriman email.
   *
   * `enabled` diturunkan dari ada atau tidaknya SMTP_HOST, bukan dari saklar
   * terpisah. Satu saklar yang bisa menyala tanpa host hanya menghasilkan
   * kegagalan saat runtime; menurunkannya dari kredensial membuat keadaan
   * "menyala tapi tidak bisa mengirim" mustahil terjadi.
   */
  mail: {
    enabled: Boolean(process.env.SMTP_HOST),
    host: process.env.SMTP_HOST || "",
    port: num(process.env.SMTP_PORT, 587),
    // 465 memakai TLS implisit; 587 memakai STARTTLS.
    secure: bool(process.env.SMTP_SECURE, num(process.env.SMTP_PORT, 587) === 465),
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.MAIL_FROM || "SignLearn <no-reply@signlearn.local>",
  },

  corsOrigins,

  /**
   * Bendera fitur AI (API Contract §10.8).
   *
   * Keduanya default MATI. Endpoint-nya sudah ada dan dijaga admin, tetapi
   * membalas `501 NOT_IMPLEMENTED` sampai integrasinya benar-benar dikerjakan.
   *
   * Blok ini sebelumnya TIDAK ADA, sementara `aiService` sudah membaca
   * `env.ai.subtitleEnabled` — pemanggilan pertama akan melempar TypeError dan
   * berakhir sebagai 500. Fitur yang belum ada seharusnya menjawab "belum ada",
   * bukan terlihat seperti server yang rusak.
   */
  ai: {
    subtitleEnabled: bool(process.env.AI_SUBTITLE_ENABLED, false),
    quizGeneratorEnabled: bool(process.env.AI_QUIZ_GENERATOR_ENABLED, false),
  },

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
