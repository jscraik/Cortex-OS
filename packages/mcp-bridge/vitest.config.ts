import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.vitest.ts', 'src/**/*.test.ts'],
    globals: true,
    environment: 'node',
    setupFiles: ['tests/setup.ts'],
  },
  coverage: {
    reporter: ['text', 'json', 'html'],
    thresholds: {
      lines: 95,
      functions: 95,
      branches: 95,
      statements: 95,
    },
  },
});
