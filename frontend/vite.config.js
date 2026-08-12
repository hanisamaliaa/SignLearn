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
  server: {
    host: "0.0.0.0",
    port: parseInt(process.env.PORT || "5173"),
    // Fall back to the next available port when the default is already used.
    // An explicit PORT value is still used as the preferred port.
    strictPort: false,
  },
  preview: {
    host: "0.0.0.0",
    port: parseInt(process.env.PORT || "5173"),
  },
});
