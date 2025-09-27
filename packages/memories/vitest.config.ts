import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'node',
		setupFiles: ['./tests/setup.ts'],
		testTimeout: 30000,
		coverage: {
			provider: 'v8',
			reporter: ['text'],
			exclude: ['vitest.config.ts', 'tests/**'],
			thresholds: {
				statements: 80,
				branches: 75,
				functions: 80,
				lines: 80,
			},
		},
	},
	resolve: {
		alias: {
			'@cortex-os/contracts': resolve(process.cwd(), 'libs/typescript/contracts/src/index.ts'),
		},
	},
});
