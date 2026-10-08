import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Runs before every test file, in the same process.
    setupFiles: ["./src/test-setup.ts"],
    // Integration tests hit the live Neon dev database (Singapore region),
    // so individual tests and suite hooks can exceed Vitest's 5s/10s
    // defaults on slow networks. These are wall-clock budgets only.
    testTimeout: 30000,
    hookTimeout: 120000,
  },
});
