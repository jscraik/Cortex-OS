import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		include: ['simple-tests/**/*.{test,spec}.ts'],
		exclude: [
			'**/node_modules/**',
			'**/dist/**',
			'**/cypress/**',
			'**/.{idea,git,cache,output,temp}/**',
		],
		environment: 'node',
		globals: false,
		typecheck: {
			enabled: false,
		},
	},
	resolve: {
		extensions: ['.ts', '.js', '.mts', '.cts', '.json'],
	},
});
