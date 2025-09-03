import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: [
      "**/__tests__/**/*.test.ts",
      "**/*.spec.ts",
      "**/*.test.ts",
    ],
    exclude: [
      "../../**", // keep Vitest confined to this package
    ],
  },
  esbuild: { target: "node18" },
});
