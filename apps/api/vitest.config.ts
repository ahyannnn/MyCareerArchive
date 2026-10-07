import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Runs before every test file, in the same process.
    setupFiles: ["./src/test-setup.ts"],
  },
});
