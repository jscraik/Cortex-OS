import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'tests/config/**/*.test.ts',
      'tests/integration/**/*.test.ts',
      'tests/performance/**/*.test.ts',
      'tests/security/**/*.test.ts',
      'tests/e2e/**/*.test.ts',
    ],
    exclude: ['node_modules/', 'dist/'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      thresholds: {
        global: {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
      },
      exclude: [
        'node_modules/',
        'dist/',
        'tests/',
        '**/*.test.ts',
        '**/*.spec.ts',
        'src/types/',
        'tests/utils/',
      ],
    },
    testTimeout: 60000, // 60 seconds for integration tests
    hookTimeout: 30000,
    setupFiles: ['tests/utils/integration-setup.ts'],
    sequence: {
      concurrent: false, // Run integration tests sequentially
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '../src'),
      '@tests': resolve(__dirname, '../tests'),
    },
  },
});
