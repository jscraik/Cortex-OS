import { resolve } from 'node:path';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [tsconfigPaths({ projects: ['../../tsconfig.json'] })],
	resolve: {
		alias: {
			'@cortex-os/a2a-core': resolve(__dirname, '../a2a/a2a-core/src'),
			'@cortex-os/a2a-contracts': resolve(__dirname, '../a2a/a2a-contracts/src'),
			'@cortex-os/a2a-transport': resolve(__dirname, '../a2a/a2a-transport/src'),
			'@cortex-os/contracts': resolve(__dirname, '../../libs/typescript/contracts/src/index.ts'),
		},
	},
	test: {
		environment: 'node',
		globals: true,
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json-summary'],
		},
	},
});
