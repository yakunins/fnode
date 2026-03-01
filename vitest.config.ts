import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/*/__tests__/**/*.test.{ts,tsx}"],
    reporters: ["default", "json"],
    outputFile: { json: ".reports/test-latest.json" },
    benchmark: {
      include: ["packages/*/__bench__/**/*.bench.ts"],
      outputJson: ".reports/bench-latest.json",
    },
    coverage: {
      provider: "v8",
      include: ["packages/*/src/**/*.ts"],
      exclude: ["packages/*/src/**/index.ts"],
      reporter: ["text", "html"],
      reportsDirectory: "coverage",
    },
  },
});
