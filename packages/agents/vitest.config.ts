import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        functions: 85,
        branches: 85,
        lines: 85,
        statements: 85
      }
    }
  }
});
