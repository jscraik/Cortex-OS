import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Prevent Vitest from auto-loading root vitest.workspace.ts when using this config
  // See: https://vitest.dev/config/#workspace (deprecated) — setting an explicit empty array disables discovery
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error - "workspace" is supported at root-level config but may not be in types
  workspace: [],
  test: {
    environment: 'node',
    include: ['simple-tests/**/*.test.ts'],
    globals: true,
    name: { label: 'simple-tests', color: 'cyan' },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '~': path.resolve(__dirname, './'),
    },
  },
  esbuild: {
    target: 'node18',
  },
});
