import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/__tests__/**/*.{test,spec}.{ts,tsx}', '**/__tests__/**/*.a11y.test.{ts,tsx}'],
    environment: 'node',
    // Run a11y/react tests with jsdom while keeping default node env for others
    environmentMatchGlobs: [['**/*.a11y.test.{ts,tsx}', 'jsdom']],
    globals: true,
    reporters: ['default'],
  },
});
