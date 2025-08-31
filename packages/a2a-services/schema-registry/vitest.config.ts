import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@cortex-os/a2a-contracts/envelope': path.resolve(
        __dirname,
        '../../a2a/a2a-contracts/src/envelope.ts',
      ),
    },
  },
});
