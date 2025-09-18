import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			exclude: ['node_modules/**', 'dist/**', '**/*.d.ts', '**/*.config.*', '**/coverage/**'],
			thresholds: {
				global: {
					branches: 85,
					functions: 85,
					lines: 85,
					statements: 85,
				},
			},
		},
		setupFiles: ['./tests/setup.ts'],
	},
});
