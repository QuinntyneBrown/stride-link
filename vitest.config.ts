// Unit suite: the pure protocol module at 100 % line and branch coverage (L2-069).
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/protocol/**/*.ts"],
      reporter: ["text", "html"],
      thresholds: { lines: 100, branches: 100, functions: 100, statements: 100 },
    },
  },
});
