import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		setupFiles: ['./src/__tests__/vitest.setup.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			include: ['src/**/*.ts'],
			exclude: [
				'**/__tests__/**',
				'**/node_modules/**',
				'**/dist/**',
				'**/demo.js',
				'**/example.ts',
				'**/*.config.ts',
			],
			thresholds: {
				statements: 85,
				branches: 85,
				functions: 85,
				lines: 85,
			},
		},
	},
	resolve: {
		alias: {
			'@': new URL('./src', import.meta.url).pathname,
		},
	},
});
