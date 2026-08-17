import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

// Vite config — https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  build: {
    // OXC/Lightning CSS pada toolchain Vite 8 gagal mengalokasikan memori pada
    // sebagian mesin Windows. Esbuild adalah minifier resmi yang didukung Vite
    // dan menghasilkan build production yang deterministik di Node 20/22/24.
    minify: "esbuild",
    cssMinify: "esbuild",
  },
  server: {
    host: "0.0.0.0",
    port: parseInt(process.env.PORT || "4789"),

    /**
     * strictPort: true — WAJIB, jangan dikembalikan ke false.
     *
     * Dengan `false`, Vite diam-diam pindah ke port berikutnya bila 4789
     * terpakai. Origin-nya lalu tidak lagi cocok dengan `CORS_ORIGINS` di
     * backend, dan setiap login ditolak browser sebagai galat CORS —
     * sementara terminal tetap menampilkan "ready" seolah semuanya normal.
     *
     * Gagal saat start jauh lebih murah daripada gagal saat login.
     */
    strictPort: true,
    proxy: {
      "/bisindo-ai": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        rewrite: (requestPath) => requestPath.replace(/^\/bisindo-ai/, "/api/v1"),
      },
    },
  },
  preview: {
    host: "0.0.0.0",
    port: parseInt(process.env.PORT || "4789"),
    strictPort: true,
  },
});
