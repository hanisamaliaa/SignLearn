import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import { env } from "./config/env.js";
import {
  errorHandler,
  notFoundHandler,
} from "./middleware/error.middleware.js";
import routes from "./routes/index.js";

const app = express();

// ─── Security middleware ───────────────────────────────────────────────
app.use(helmet());

// CORS — allow configured origins (or all in development).
app.use(
  cors({
    origin(origin, callback) {
      if (!env.isProduction || !origin) return callback(null, true);
      if (env.corsOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

// ─── Body parsing ──────────────────────────────────────────────────────
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// ─── Logging ───────────────────────────────────────────────────────────
if (!env.isProduction) {
  app.use(morgan("dev"));
}

// ─── Global rate limit ─────────────────────────────────────────────────
app.use(
  rateLimit({
    windowMs: env.rateLimit.windowMs,
    max: env.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

// ─── API routes ────────────────────────────────────────────────────────
app.use("/api", routes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// ─── 404 & error handling ──────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
