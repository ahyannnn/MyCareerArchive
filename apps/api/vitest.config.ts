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
    coverage: {
      provider: "v8",
      reporter: ["text"],
      // Test helpers are not production code.
      exclude: ["src/test-utils/**"],
      // Phase 10 floor: the suite must stay above these or fail.
      thresholds: {
        statements: 88,
        branches: 78,
        functions: 90,
        lines: 88,
      },
    },
  },
});
