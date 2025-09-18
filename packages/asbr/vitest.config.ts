import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		globals: true,
		// Use node environment; server and crypto APIs are required. Individual
		// tests that need DOM can override via `@vitest-environment jsdom`.
		environment: 'node',
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			thresholds: {
				global: {
					branches: 85,
					functions: 85,
					lines: 85,
					statements: 85,
				},
			},
			exclude: ['node_modules/', 'dist/', 'tests/', '**/*.test.ts', '**/*.spec.ts', 'src/types/'],
		},
		include: ['tests/**/*.test.ts', 'tests/**/*.spec.ts'],
		exclude: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.next/**'],
		testTimeout: 30000,
		hookTimeout: 10000,
		setupFiles: ['tests/utils/write-guard.ts', 'tests/setup.global.ts'],
	},
	resolve: {
		alias: {
			'@': resolve(__dirname, 'src'),
			// During tests, route winston to a tiny mock to avoid heavy deps
			winston: resolve(__dirname, 'tests/mocks/winston.mock.ts'),
			// Stub boxen to avoid requiring the heavy dependency in tests
			boxen: resolve(__dirname, 'tests/mocks/boxen.mock.ts'),
		},
	},
});
