import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// En desarrollo, /api se envía al backend Spring Boot (puerto 8080): no hace falta configurar CORS.
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  server: {
    port: 5173,
    proxy: { "/api": { target: process.env.VITE_API_URL ?? "http://localhost:8080", changeOrigin: true } },
  },
});
