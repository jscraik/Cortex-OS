import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      enabled: true,
      reporter: ['text', 'json'],
      thresholds: { statements: 95, branches: 95, functions: 95, lines: 95 },
    },
  },
});
