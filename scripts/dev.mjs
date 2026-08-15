import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

/**
 * Menjalankan ketiga layanan sekaligus: backend, AI, dan frontend.
 *
 * ── Kenapa berkas ini peduli pada sistem operasi ──────────────────────
 *
 * Python menaruh executable virtualenv di tempat yang BERBEDA per platform:
 * `.venv/bin/` di macOS dan Linux, `.venv/Scripts/` di Windows. Versi
 * sebelumnya menuliskan `bin/` saja, sehingga di Windows pemeriksaan di bawah
 * gagal dan menampilkan "AI virtual environment is missing" — padahal venv-nya
 * ada dan lengkap. Pesan yang salah menuduh membuat orang membongkar ulang
 * lingkungan yang sebenarnya sehat.
 */

const root = path.resolve(import.meta.dirname, "..");
const isWindows = os.platform() === "win32";

const venvBin = path.join(root, "ai", ".venv", isWindows ? "Scripts" : "bin");
const uvicorn = path.join(venvBin, isWindows ? "uvicorn.exe" : "uvicorn");

if (!existsSync(uvicorn)) {
  console.error(`Virtual environment AI tidak ditemukan di: ${uvicorn}`);
  console.error("Ikuti langkah penyiapan di ai/README.md lebih dulu.");
  process.exit(1);
}

/**
 * `npm` di Windows adalah `npm.cmd`, bukan biner.
 *
 * `spawn("npm", …)` tanpa `shell: true` gagal dengan ENOENT di sana, dan
 * pesannya hanya menyebut "npm" — tidak menjelaskan bahwa masalahnya ekstensi
 * berkas, bukan npm yang belum terpasang.
 */
const npmRun = (workspace) =>
  spawn("npm", ["--prefix", workspace, "run", "dev"], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
    shell: isWindows,
  });

// Direktori cache Matplotlib & XDG. `/tmp` tidak ada di Windows; memakainya
// membuat Matplotlib memuntahkan peringatan setiap start.
const cacheDir = path.join(os.tmpdir(), "signlearn-cache");

const services = [
  npmRun("backend"),
  spawn(uvicorn, ["app.main:app", "--app-dir", "ai", "--host", "127.0.0.1", "--port", "8000"], {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      MPLCONFIGDIR: path.join(cacheDir, "matplotlib"),
      XDG_CACHE_HOME: cacheDir,
    },
  }),
  npmRun("frontend"),
];

let stopping = false;

function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  for (const service of services) {
    if (!service.killed) service.kill("SIGTERM");
  }
  setTimeout(() => process.exit(exitCode), 100);
}

for (const service of services) {
  service.on("error", (error) => {
    console.error(error.message);
    stop(1);
  });
  service.on("exit", (code, signal) => {
    if (!stopping) {
      console.error(`Layanan pengembangan berhenti (${signal || code}).`);
      stop(code || 1);
    }
  });
}

process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
