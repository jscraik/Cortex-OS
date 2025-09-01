/**
 * @file_path packages/mcp-server/vitest.config.ts
 * @description Vitest configuration for MCP server tests
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/**', 'dist/**', 'tests/**', '*.config.*'],
      thresholds: {
        global: {
          branches: 95,
          functions: 95,
          lines: 95,
          statements: 95,
        },
      },
    },
    testTimeout: 10000,
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules/**', 'dist/**'],
  },
});
