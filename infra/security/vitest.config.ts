import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/__tests__/**/*.test.js'],
    globals: true,
    isolate: true,
    sequence: { concurrent: false },
    testTimeout: 10000,
    coverage: {
      include: ['rasp/**'],
    },
  },
  resolve: {
    alias: {
      '@security': path.resolve(__dirname),
    },
  },
});
