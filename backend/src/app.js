import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import { env } from "./config/env.js";
import routes from "./routes/index.js";
import {
  errorHandler,
  notFoundHandler,
} from "./middleware/error.middleware.js";

const app = express();

// ==============================
// Security
// ==============================
app.use(helmet());

// ==============================
// Body Parser (HARUS sebelum routes)
// ==============================
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// ==============================
// CORS
// ==============================
app.use(
  cors({
    origin(origin, callback) {
      if (!env.isProduction || !origin) {
        return callback(null, true);
      }

      if (env.corsOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

// ==============================
// Logging
// ==============================
if (!env.isProduction) {
  app.use(morgan("dev"));
}

// ==============================
// Rate Limit
// ==============================
app.use(
  rateLimit({
    windowMs: env.rateLimit.windowMs,
    max: env.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

// ==============================
// Health Check
// ==============================
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "OK",
    uptime: process.uptime(),
  });
});

// ==============================
// API Routes
// ==============================
app.use("/api", routes);

// ==============================
// 404 Handler
// ==============================
app.use(notFoundHandler);

// ==============================
// Error Handler
// ==============================
app.use(errorHandler);

export default app;
