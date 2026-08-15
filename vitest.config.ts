import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "shared/src"),
    },
  },
  test: {
    include: ["apps/**/*.test.ts"],
  },
});
