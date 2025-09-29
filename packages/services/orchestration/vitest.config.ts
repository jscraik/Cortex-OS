import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const packageDir = fileURLToPath(new URL('.', import.meta.url));
const workspaceRoot = resolve(packageDir, '../../..');
const agentsEntry = resolve(workspaceRoot, 'packages/agents/src/index.ts');
const orchestrationEntry = resolve(workspaceRoot, 'packages/orchestration/src/index.ts');
const modelGatewayEntry = resolve(workspaceRoot, 'packages/model-gateway/src/index.ts');

export default defineConfig({
	test: {
		environment: 'node',
		globals: true,
		// Keep this package isolated from the root workspace issues
		include: ['src/**/*.{test,spec}.ts', 'tests/**/*.{test,spec}.ts'],
		exclude: ['**/node_modules/**', '**/dist/**', '**/build/**'],
		pool: 'forks',
		poolOptions: { forks: { singleFork: true, maxForks: 1, minForks: 1 } },
	},
	resolve: {
		alias: {
			'@cortex-os/agents': agentsEntry,
			'@cortex-os/orchestration': orchestrationEntry,
			'@cortex-os/model-gateway': modelGatewayEntry,
		},
	},
});
