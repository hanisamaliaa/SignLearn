import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

/**
 * Menjalankan executable dari virtualenv AI, apa pun sistem operasinya.
 *
 * Python menaruh executable venv di `.venv/bin/` pada macOS dan Linux, tetapi
 * di `.venv/Scripts/` pada Windows — dan di Windows namanya berakhiran `.exe`.
 * Skrip npm tidak dapat bercabang berdasarkan platform, jadi seluruh perintah
 * `ai:*` melewati berkas ini alih-alih menuliskan salah satu jalur secara
 * harfiah dan diam-diam hanya bekerja di separuh mesin tim.
 *
 *   node scripts/venv-run.mjs uvicorn app.main:app --port 8000
 *   node scripts/venv-run.mjs python -m ai.training.train …
 */

const root = path.resolve(import.meta.dirname, "..");
const isWindows = os.platform() === "win32";
const venvBin = path.join(root, "ai", ".venv", isWindows ? "Scripts" : "bin");

const [name, ...args] = process.argv.slice(2);

if (!name) {
  console.error("Pemakaian: node scripts/venv-run.mjs <executable> [argumen…]");
  process.exit(1);
}

const executable = path.join(venvBin, isWindows ? `${name}.exe` : name);

if (!existsSync(executable)) {
  console.error(`Tidak ditemukan di virtualenv AI: ${executable}`);
  console.error("Ikuti langkah penyiapan di ai/README.md lebih dulu.");
  process.exit(1);
}

const cacheDir = path.join(os.tmpdir(), "signlearn-cache");

const child = spawn(executable, args, {
  cwd: root,
  stdio: "inherit",
  env: {
    ...process.env,
    MPLCONFIGDIR: path.join(cacheDir, "matplotlib"),
    XDG_CACHE_HOME: cacheDir,
  },
});

child.on("error", (error) => {
  console.error(error.message);
  process.exit(1);
});
child.on("exit", (code, signal) => process.exit(signal ? 1 : (code ?? 0)));
