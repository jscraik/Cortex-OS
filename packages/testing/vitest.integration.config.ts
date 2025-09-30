import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		include: ['src/integration/**/*.test.ts'],
		exclude: ['src/unit/**/*.test.ts', 'src/parity/**/*.test.ts', 'src/soak/**/*.test.ts'],
		testTimeout: 60000,
		hookTimeout: 60000,
		teardownTimeout: 60000,
		pool: 'threads',
		poolOptions: {
			threads: {
				singleThread: true, // Integration tests run sequentially
				minThreads: 1,
				maxThreads: 1,
			},
		},
		reporters: ['verbose'],
		setupFiles: ['./src/test-setup.ts'],
		globalSetup: ['./src/integration/global-setup.ts'],
	},
	resolve: {
		alias: {
			'@cortex-os/memory-core': resolve(__dirname, '../memory-core/src'),
			'@cortex-os/mcp-server': resolve(__dirname, '../mcp-server/src'),
			'@cortex-os/memory-rest-api': resolve(__dirname, '../memory-rest-api/src'),
			'@cortex-os/tool-spec': resolve(__dirname, '../tool-spec/src'),
		},
	},
});
