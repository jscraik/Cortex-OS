import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      thresholds: {
        statements: 85,
        lines: 85,
        functions: 80,
        branches: 60,
      },
    },
  },
});
