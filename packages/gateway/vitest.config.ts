import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'node',
		globals: true,
		include: ['**/__tests__/**/*.test.ts', '**/*.spec.ts', '**/*.test.ts'],
		exclude: ['node_modules/**', 'dist/**'],
	},
	esbuild: { target: 'node18' },
});
