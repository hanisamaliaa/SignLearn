import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from the project root (backend/).
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

function parsePort(value, fallback) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

function parseBool(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  return String(value).toLowerCase() === "true";
}

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  isProduction: process.env.NODE_ENV === "production",
  port: parsePort(process.env.PORT, 5000),

  db: {
    host: process.env.DB_HOST || "localhost",
    port: parsePort(process.env.DB_PORT, 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "signlearn",
    connectionLimit: parsePort(process.env.DB_CONNECTION_LIMIT, 10),
  },

  jwt: {
    secret: process.env.JWT_SECRET || "dev-only-secret-change-me",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
  },

  corsOrigins: (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),

  bcryptRounds: parsePort(process.env.BCRYPT_ROUNDS, 10),

  rateLimit: {
    windowMs: parsePort(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    max: parsePort(process.env.RATE_LIMIT_MAX, 100),
  },

  ai: {
    subtitleEnabled: parseBool(process.env.AI_SUBTITLE_ENABLED),
    quizGeneratorEnabled: parseBool(process.env.AI_QUIZ_GENERATOR_ENABLED),
  },
};
