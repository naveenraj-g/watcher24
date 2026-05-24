import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Resolve workspace packages from their TypeScript source during tests
    // so we don't need to build them first.
    alias: {
      "@watcher/core": resolve(__dirname, "../core/src/index.ts"),
      "@watcher/node": resolve(__dirname, "../node/src/index.ts"),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
