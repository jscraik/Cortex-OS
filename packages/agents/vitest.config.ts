import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
		environment: 'node',
		globals: true,
		setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        'tests/**',
        'examples/**',
        'scripts/**',
        'vitest.config.ts',
        'coverage/**',
      ],
      thresholds: {
        functions: 80,
        branches: 70,
        lines: 85,
        statements: 85,
      },
			reportOnFailure: true,
		},
		testTimeout: 10000,
		hookTimeout: 5000,
	},
	resolve: {
		alias: {
			'@': resolve(__dirname, './src'),
			'@tests': resolve(__dirname, './tests'),
		},
	},
});
