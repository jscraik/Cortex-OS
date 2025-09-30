import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			exclude: [
				'node_modules/',
				'dist/',
				'**/*.d.ts',
				'**/*.config.*',
				'**/test/**',
				'**/__tests__/**',
				'**/fixtures/**',
			],
			thresholds: {
				global: {
					branches: 85,
					functions: 85,
					lines: 85,
					statements: 85,
				},
			},
		},
		testTimeout: 30000,
		hookTimeout: 30000,
		teardownTimeout: 30000,
		pool: 'threads',
		poolOptions: {
			threads: {
				singleThread: false,
				minThreads: 1,
				maxThreads: 4,
			},
		},
		reporters: ['verbose', 'json'],
		outputFile: {
			json: './test-results/results.json',
		},
		setupFiles: ['./src/test-setup.ts'],
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
