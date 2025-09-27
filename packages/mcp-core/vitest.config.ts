import { defineConfig } from 'vitest/config';

export default defineConfig({
	root: __dirname,
	test: {
		environment: 'node',
		globals: true,
		include: ['tests/**/*.test.ts', 'tests/**/*.spec.ts'],
		exclude: ['../../**'],
	},
});
