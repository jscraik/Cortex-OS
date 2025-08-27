import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/evidence-validator/tests/**'],
    passWithNoTests: true,
  },
});
