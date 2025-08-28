import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@cortex-os/telemetry': path.resolve(__dirname, 'test-telemetry-mock.ts'),
    },
  },
});
