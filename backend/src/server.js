import app from "./app.js";
import { env } from "./config/env.js";
import { testConnection } from "./config/database.js";

async function start() {
  // Try to connect to MySQL but do NOT crash the server if it is unavailable.
  // The API layer is schema-ready; queries are wired in repositories later.
  const db = await testConnection();
  if (db.ok) {
    console.log(`[db] ${db.message}`);
  } else {
    console.warn(`[db] ${db.message} — continuing without a live database.`);
  }

  app.listen(env.port, () => {
    console.log(
      `[server] SignLearn API running on http://localhost:${env.port}`,
    );
    console.log(`[server] Environment: ${env.nodeEnv}`);
  });
}

start().catch((err) => {
  console.error("[server] Failed to start:", err);
  process.exit(1);
});
