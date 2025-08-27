import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['simple-tests/**/*.test.ts'],
  },
});
