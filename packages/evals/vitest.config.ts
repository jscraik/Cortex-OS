import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'istanbul',
      statements: 95,
      branches: 95,
      functions: 95,
      lines: 95,
      reporter: ['text', 'json'],
    },
  },
});
