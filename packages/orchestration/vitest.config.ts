import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	test: {
		environment: 'node',
		include: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'lcov'],
			thresholds: {
				statements: 85,
				branches: 85,
				functions: 85,
				lines: 85,
			},
		},
	},
	resolve: {
		alias: {
			'@cortex-os/a2a-contracts': resolve(__dirname, '../a2a/a2a-contracts/src'),
			'@cortex-os/a2a-core': resolve(__dirname, '../a2a/a2a-core/src'),
			'@cortex-os/a2a-transport': resolve(__dirname, '../a2a/a2a-transport/src'),
			'@cortex-os/hooks': resolve(__dirname, '../hooks/src'),
			'@cortex-os/kernel': resolve(__dirname, '../kernel/src'),
			'@cortex-os/agents': resolve(__dirname, '../agents/src'),
			'@cortex-os/orchestration': resolve(__dirname, './src'),
			'@cortex-os/model-gateway': resolve(__dirname, '../model-gateway/src'),
			'@cortex-os/commands': resolve(__dirname, '../commands/src'),
			'@cortex-os/contracts': resolve(
				__dirname,
				'..',
				'..',
				'libs',
				'typescript',
				'contracts',
				'src',
			),
		},
	},
});
