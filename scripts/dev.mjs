import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");
const uvicorn = path.join(root, "ai", ".venv", "bin", "uvicorn");

if (!existsSync(uvicorn)) {
  console.error("AI virtual environment is missing.");
  console.error("Run the setup commands in ai/README.md first.");
  process.exit(1);
}

const services = [
  spawn(
    uvicorn,
    ["app.main:app", "--app-dir", "ai", "--host", "127.0.0.1", "--port", "8000"],
    {
      cwd: root,
      stdio: "inherit",
      env: {
        ...process.env,
        MPLCONFIGDIR: "/tmp/signlearn-matplotlib",
        XDG_CACHE_HOME: "/tmp/signlearn-cache",
      },
    },
  ),
  spawn("npm", ["--prefix", "frontend", "run", "dev"], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  }),
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
      console.error(`Development service stopped (${signal || code}).`);
      stop(code || 1);
    }
  });
}

process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
