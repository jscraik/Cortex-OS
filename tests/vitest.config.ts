import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	resolve: {
		alias: {
			'@cortex-os/memory-core': resolve(__dirname, '../packages/memory-core/src'),
		},
	},
	test: {
		environment: 'node',
		include: ['tests/**/*.spec.ts', 'tests/**/*.test.ts'],
		exclude: ['**/node_modules/**', '**/dist/**'],
	},
	tsconfig: './tsconfig.json',
});
