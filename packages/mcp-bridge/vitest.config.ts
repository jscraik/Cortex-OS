import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			exclude: ['node_modules', 'dist', '*.config.ts'],
			branches: 90,
			functions: 90,
			lines: 90,
			statements: 90,
		},
	},
});
