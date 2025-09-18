import { defineWorkspace } from 'vitest/config';

// MEMORY SAFETY: Global defaults applied to ALL workspace projects
// Individual package configs CANNOT override these critical safety limits
const MEMORY_SAFE_DEFAULTS = {
	test: {
		// EMERGENCY CONSTRAINTS - Applied to ALL packages
		maxWorkers: 1,
		fileParallelism: false,
		pool: 'forks',
		poolOptions: {
			forks: {
				singleFork: true,
				maxForks: 1,
				minForks: 1,
				execArgv: [
					'--max-old-space-size=1536',
					'--heapsnapshot-near-heap-limit=1',
					'--expose-gc',
					'--max-semi-space-size=64',
					'--optimize-for-size',
				],
			},
		},
		isolate: true,
		sequence: { concurrent: false },
		testTimeout: 20000,
		hookTimeout: 20000,
		teardownTimeout: 5000,
	},
};

export default defineWorkspace([
	// Each project inherits MEMORY_SAFE_DEFAULTS automatically
	{
		...MEMORY_SAFE_DEFAULTS,
		extends: 'apps/cortex-os/vitest.config.ts',
	},
	{
		...MEMORY_SAFE_DEFAULTS,
		extends: 'apps/cortex-webui/vitest.config.ts',
	},
	{
		...MEMORY_SAFE_DEFAULTS,
		extends: 'packages/a2a/vitest.config.ts',
	},
	{
		...MEMORY_SAFE_DEFAULTS,
		extends: 'packages/a2a-services/schema-registry/vitest.config.ts',
	},
	{
		...MEMORY_SAFE_DEFAULTS,
		extends: 'packages/a2a-services/common/vitest.config.ts',
	},
	{
		...MEMORY_SAFE_DEFAULTS,
		extends: 'packages/agents/vitest.config.ts',
	},
	{
		...MEMORY_SAFE_DEFAULTS,
		extends: 'packages/asbr/vitest.config.ts',
	},
	{
		...MEMORY_SAFE_DEFAULTS,
		extends: 'packages/kernel/vitest.config.ts',
	},
	{
		...MEMORY_SAFE_DEFAULTS,
		extends: 'packages/mcp/vitest.config.ts',
	},
	{
		...MEMORY_SAFE_DEFAULTS,
		extends: 'packages/memories/vitest.config.ts',
	},
	{
		...MEMORY_SAFE_DEFAULTS,
		extends: 'packages/mvp/vitest.config.ts',
	},
	{
		...MEMORY_SAFE_DEFAULTS,
		extends: 'packages/mvp-core/vitest.config.ts',
	},
	{
		...MEMORY_SAFE_DEFAULTS,
		extends: 'packages/mvp-server/vitest.config.ts',
	},
	{
		...MEMORY_SAFE_DEFAULTS,
		extends: 'packages/orchestration/vitest.config.ts',
	},
	{
		...MEMORY_SAFE_DEFAULTS,
		extends: 'packages/prp-runner/vitest.config.ts',
	},
	{
		...MEMORY_SAFE_DEFAULTS,
		extends: 'packages/model-gateway/vitest.config.ts',
	},
	{
		...MEMORY_SAFE_DEFAULTS,
		extends: 'packages/rag/vitest.config.ts',
	},
	{
		...MEMORY_SAFE_DEFAULTS,
		extends: 'packages/simlab/vitest.config.ts',
	},
	{
		...MEMORY_SAFE_DEFAULTS,
		extends: 'packages/cortex-logging/vitest.config.ts',
	},
	{
		...MEMORY_SAFE_DEFAULTS,
		extends: 'libs/typescript/contracts/vitest.config.ts',
	},
	{
		...MEMORY_SAFE_DEFAULTS,
		extends: 'simple-tests/vitest.config.ts',
	},
	{
		...MEMORY_SAFE_DEFAULTS,
		extends: 'website/vitest.config.ts',
	},
]);
