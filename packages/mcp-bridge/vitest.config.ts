import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.vitest.ts', 'src/**/*.test.ts'],
    globals: true,
    environment: 'node',
  },
});
