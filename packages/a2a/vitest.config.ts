import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: { environment: 'node' },
  resolve: {
    alias: {
      '@cortex-os/telemetry': resolve(__dirname, './tests/telemetry-mock.ts'),
      '@cortex-os/a2a-core': resolve(__dirname, './a2a-core/src'),
      '@cortex-os/a2a-contracts': resolve(__dirname, './a2a-contracts/src'),
    },
  },
});
