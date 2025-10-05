import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	resolve: {
		alias: {
			'@cortex-os/cbom': path.resolve(__dirname, './src/index.ts'),
		},
	},
	test: {
		globals: true,
		environment: 'node',
		include: ['packages/cbom/tests/**/*.test.ts'],
	},
});
