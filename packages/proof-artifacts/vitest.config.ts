import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    reporters: ['dot'],
    coverage: {
      reporter: ['text-summary', 'json-summary']
    }
  }
});
