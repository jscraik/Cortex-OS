import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const currentDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	resolve: {
		alias: {
			'@cortex-os/agents': resolve(
				currentDir,
				'__tests__/stubs/agent-mcp-client.js',
			),
			'@cortex-os/a2a-contracts': resolve(
				currentDir,
				'../a2a/a2a-contracts/src',
			),
			'@cortex-os/a2a-core': resolve(currentDir, '../a2a/a2a-core/src'),
			'@cortex-os/a2a-transport': resolve(
				currentDir,
				'../a2a/a2a-transport/src',
			),
			'@cortex-os/contracts': resolve(
				currentDir,
				'..',
				'..',
				'libs',
				'typescript',
				'contracts',
				'src',
			),
		},
	},
	test: {
		environment: 'node',
		coverage: {
			provider: 'v8',
			include: ['src/**/*.ts'],
			reportsDirectory: './coverage-rag',
			reporter: ['text-summary', 'json-summary'],
		},
	},
});
