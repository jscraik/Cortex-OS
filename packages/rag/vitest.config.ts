import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const currentDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	resolve: {
		alias: {
			'@cortex-os/prompts': resolve(currentDir, '../prompts/src'),
			'@cortex-os/a2a-core/bus': resolve(currentDir, '__tests__/stubs/a2a-core.ts'),
			'@cortex-os/a2a-core/transport': resolve(currentDir, '__tests__/stubs/a2a-core-transport.ts'),
			'@cortex-os/observability': resolve(currentDir, '../observability/src'),
			'@cortex-os/agents': resolve(currentDir, '__tests__/stubs/agent-mcp-client.ts'),
			'@cortex-os/a2a-contracts': resolve(currentDir, '__tests__/stubs/a2a-contracts.ts'),
			'@cortex-os/a2a-contracts/dist/src': resolve(currentDir, '__tests__/stubs/a2a-contracts.ts'),
			'../a2a/a2a-contracts/src/envelope.js': resolve(
				currentDir,
				'__tests__/stubs/a2a-contracts.ts',
			),
			'../../a2a-contracts/src/envelope.js': resolve(
				currentDir,
				'__tests__/stubs/a2a-contracts.ts',
			),
			'../a2a-contracts/src/envelope.js': resolve(currentDir, '__tests__/stubs/a2a-contracts.ts'),
			'../a2a/a2a-contracts/src/envelope.ts': resolve(
				currentDir,
				'__tests__/stubs/a2a-contracts.ts',
			),
			'../../a2a-contracts/src/envelope.ts': resolve(
				currentDir,
				'__tests__/stubs/a2a-contracts.ts',
			),
			'../a2a-contracts/src/envelope.ts': resolve(currentDir, '__tests__/stubs/a2a-contracts.ts'),
			'@cortex-os/a2a-core': resolve(currentDir, '__tests__/stubs/a2a-core.ts'),
			'@cortex-os/a2a-transport': resolve(currentDir, '../a2a/a2a-transport/src'),
			// Some internal packages import the built contracts dist path; map it to src for tests
			'@cortex-os/contracts/dist/src': resolve(
				currentDir,
				'..',
				'..',
				'libs',
				'typescript',
				'contracts',
				'src',
			),
			'@cortex-os/contracts/dist': resolve(
				currentDir,
				'..',
				'..',
				'libs',
				'typescript',
				'contracts',
				'src',
			),
			'@cortex-os/contracts/dist/src/index.js': resolve(
				currentDir,
				'__tests__/stubs/contracts-index.js',
			),
			'@cortex-os/contracts/dist/src/index': resolve(
				currentDir,
				'..',
				'..',
				'libs',
				'typescript',
				'contracts',
				'src',
				'index.ts',
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
			'@cortex-os/utils': resolve(currentDir, '..', '..', 'libs', 'typescript', 'utils', 'src'),
		},
	},
	test: {
		environment: 'node',
		coverage: {
			provider: 'v8',
			include: ['src/**/*.ts'],
			reportsDirectory: './coverage-rag',
			reporter: ['text-summary', 'json-summary'],
			thresholds: {
				lines: 90,
				functions: 90,
				branches: 85,
				statements: 90,
			},
		},
	},
});
