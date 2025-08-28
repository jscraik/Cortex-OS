import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', '*.config.ts', '**/*.d.ts'],
    },
    testTimeout: 30000,
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      '@cortex-os/mcp-registry': path.resolve(__dirname, '../../packages/mcp-registry/src'),
      '@cortex-os/mcp': path.resolve(__dirname, '../../packages/mcp/src'),
    },
  },
});
