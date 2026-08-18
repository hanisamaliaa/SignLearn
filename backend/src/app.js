import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import { env } from "./config/env.js";
import { testConnection } from "./config/database.js";
import { globalLimiter } from "./middleware/rateLimit.middleware.js";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";
import { ApiError } from "./utils/ApiError.js";
import { ERROR_CODES } from "./constants/errorCodes.js";
import routes from "./routes/index.js";
import { isCloudinaryConfigured } from "./services/cloudinaryService.js";

const app = express();

/**
 * Wajib di belakang proxy (Vercel, Railway, Nginx).
 *
 * Tanpa ini `req.ip` berisi IP proxy untuk SEMUA pengunjung, sehingga rate
 * limiter memperlakukan seluruh dunia sebagai satu klien — satu penyerang
 * dapat mengunci seluruh pengguna.
 *
 * Nilainya 1, bukan `true`: mempercayai seluruh rantai memungkinkan klien
 * memalsukan `X-Forwarded-For` dan menghindari rate limit sepenuhnya.
 */
app.set("trust proxy", 1);

// Jangan umumkan bahwa ini Express.
app.disable("x-powered-by");

// ─── Keamanan ────────────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: env.isProduction ? undefined : false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

/**
 * CORS dengan kredensial.
 *
 * `credentials: true` wajib agar browser mengirim cookie refresh. Konsekuensinya
 * origin TIDAK BOLEH wildcard — spesifikasi melarang `*` bersama kredensial,
 * dan browser akan menolak responsnya. Karena itu `CORS_ORIGINS` divalidasi
 * sebagai wajib di produksi (config/env.js).
 */
app.use(
  cors({
    origin(origin, callback) {
      // Request tanpa origin: curl, health check, aplikasi mobile.
      if (!origin) return callback(null, true);
      if (!env.isProduction) return callback(null, true);
      if (env.corsOrigins.includes(origin)) return callback(null, true);

      // ApiError 403, bukan Error biasa. Error biasa berakhir sebagai 500
      // dengan stack trace penuh di log — padahal origin asing bukan kegagalan
      // server melainkan permintaan yang memang ditolak. Setiap pemindai di
      // internet akan memicunya, dan log produksi jadi penuh "kesalahan" yang
      // sepenuhnya dikendalikan orang luar sehingga insiden nyata tenggelam.
      return callback(
        new ApiError(403, "Origin tidak diizinkan oleh kebijakan CORS.", {
          code: ERROR_CODES.FORBIDDEN,
        }),
      );
    },
    credentials: true,
    exposedHeaders: ["RateLimit-Limit", "RateLimit-Remaining", "RateLimit-Reset"],
  }),
);

// ─── Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());

// ─── Logging ─────────────────────────────────────────────────────────────
if (!env.isProduction && !env.isTest) {
  app.use(morgan("dev"));
}

// ─── Rate limit global ───────────────────────────────────────────────────
app.use(globalLimiter);

// ─── Health check ────────────────────────────────────────────────────────
// Di luar prefix versi: monitoring tidak boleh rusak saat API naik versi.
app.get("/api/health", async (_req, res) => {
  const database = await testConnection();
  res.status(database.ok ? 200 : 503).json({
    status: database.ok ? "ok" : "unavailable",
    database: database.ok ? "connected" : "unavailable",
    mediaStorage: isCloudinaryConfigured() ? "configured" : "unconfigured",
    uptime: Math.round(process.uptime()),
    environment: env.nodeEnv,
  });
});

// ─── Rute API ────────────────────────────────────────────────────────────
app.use(env.apiPrefix, routes);

// ─── 404 & error ─────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
