import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'node',
		include: ['tests/**/*.spec.ts', 'tests/**/*.test.ts'],
		exclude: ['**/node_modules/**', '**/dist/**'],
	},
	tsconfig: './tsconfig.json',
});
