import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "../../shared/src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/trpc": "http://localhost:4000",
      "/api": "http://localhost:4000",
    },
  },
});
