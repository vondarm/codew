import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: [],
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    coverage: {
      enabled: false,
    },
  },
});
