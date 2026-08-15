import app from "./app.js";
import { env } from "./config/env.js";
import { testConnection, closePool } from "./config/database.js";

/**
 * Entry point.
 *
 * Bertanggung jawab atas siklus hidup proses: memverifikasi dependensi,
 * mendengarkan port, dan mematikan diri dengan rapi.
 */

async function start() {
  const db = await testConnection();

  if (!db.ok) {
    // Database adalah sumber kebenaran akun, progres, dan konten. Menjalankan
    // server setengah hidup hanya menghasilkan health check palsu dan 500 pada
    // login. Gagal cepat di semua environment agar salah konfigurasi terlihat.
    console.error(`[db] Koneksi gagal: ${db.message}`);
    process.exit(1);
  }
  console.log(`[db] ${db.message}`);

  const server = app.listen(env.port, () => {
    console.log(`[server] SignLearn API — http://localhost:${env.port}${env.apiPrefix}`);
    console.log(`[server] Environment: ${env.nodeEnv}`);
  });

  // ─── Graceful shutdown ─────────────────────────────────────────────────
  // Tanpa ini, deploy memutus request yang sedang berjalan di tengah jalan
  // dan meninggalkan transaksi database menggantung.
  let shuttingDown = false;

  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\n[server] ${signal} diterima — menutup dengan rapi…`);

    server.close(async () => {
      await closePool();
      console.log("[server] Selesai.");
      process.exit(0);
    });

    // Jaring pengaman: jangan menggantung selamanya bila ada koneksi macet.
    setTimeout(() => {
      console.error("[server] Batas waktu penutupan terlampaui — keluar paksa.");
      process.exit(1);
    }, 10_000).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

// Promise yang ditolak tanpa handler akan menjatuhkan Node sejak v15.
// Ditangkap agar tercatat dengan konteks, bukan sekadar stack trace telanjang.
process.on("unhandledRejection", (reason) => {
  console.error("[server] Unhandled rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("[server] Uncaught exception:", err);
  process.exit(1);
});

start().catch((err) => {
  console.error("[server] Gagal start:", err);
  process.exit(1);
});
