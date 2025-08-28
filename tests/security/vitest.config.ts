import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@cortex-os/mvp-core': path.resolve(__dirname, '../../packages/mvp-core/src'),
    },
  },
  test: {
    root: path.resolve(__dirname, '../..'),
    include: ['tests/security/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'lcov'],
      include: ['packages/**/src/**'],
    },
  },
});
