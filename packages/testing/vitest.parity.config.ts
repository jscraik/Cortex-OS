import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/parity/**/*.test.ts'],
    testTimeout: 120000,
    hookTimeout: 120000,
    teardownTimeout: 120000,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true, // Parity tests need controlled environment
        minThreads: 1,
        maxThreads: 1,
      },
    },
    reporters: ['verbose'],
    setupFiles: ['./src/test-setup.ts'],
    globalSetup: ['./src/parity/global-setup.ts'],
  },
  resolve: {
    alias: {
      '@cortex-os/memory-core': resolve(__dirname, '../memory-core/src'),
      '@cortex-os/mcp-server': resolve(__dirname, '../mcp-server/src'),
      '@cortex-os/memory-rest-api': resolve(__dirname, '../memory-rest-api/src'),
      '@cortex-os/tool-spec': resolve(__dirname, '../tool-spec/src'),
    },
  },
});