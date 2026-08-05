import dotenv from "dotenv";

dotenv.config();

const parsePort = (value, fallback) => {
  const n = Number(value);
  return Number.isNaN(n) ? fallback : n;
};

const parseBool = (value) => {
  if (typeof value !== "string") return false;
  return ["true", "1", "yes", "on"].includes(value.toLowerCase());
};

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  isProduction: process.env.NODE_ENV === "production",
  port: parsePort(process.env.PORT, 5000),

  databaseUrl: process.env.DATABASE_URL,

  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,

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
