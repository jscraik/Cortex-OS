import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'node',
		globals: true,
		include: ['**/*.test.ts'],
		slowTestThreshold: 2000,
	},
	resolve: {
		preserveSymlinks: true,
	},
	tsconfig: path.resolve(__dirname, '../tsconfig.json'),
});
