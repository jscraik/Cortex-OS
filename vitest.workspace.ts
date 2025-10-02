import { access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
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

const PROJECT_PATHS = [
	'apps/cortex-os/vitest.config.ts',
	'apps/api/vitest.config.ts',
	'apps/cortex-webui/vitest.config.ts',
	'packages/a2a/vitest.config.ts',
	'packages/a2a-services/schema-registry/vitest.config.ts',
	'packages/a2a-services/common/vitest.config.ts',
	'packages/agents/vitest.config.ts',
	'packages/asbr/vitest.config.ts',
	'packages/kernel/vitest.config.ts',
	'packages/mcp/vitest.config.ts',
	'packages/memories/vitest.config.ts',
	'packages/mvp/vitest.config.ts',
	'packages/mvp-core/vitest.config.ts',
	'packages/mvp-server/vitest.config.ts',
	'packages/orchestration/vitest.config.ts',
	'packages/prp-runner/vitest.config.ts',
	'packages/services/orchestration/vitest.config.ts',
	'packages/model-gateway/vitest.config.ts',
	'packages/rag/vitest.config.ts',
	'packages/simlab/vitest.config.ts',
	'packages/cortex-logging/vitest.config.ts',
	'packages/hooks/vitest.config.ts',
	'services/memories/vitest.config.ts',
	'packages/commands/vitest.config.ts',
	'libs/typescript/contracts/vitest.config.ts',
	'simple-tests/vitest.config.ts',
	'tests/vitest.config.ts',
	'website/vitest.config.ts',
];

type WorkspaceProject = Parameters<typeof defineWorkspace>[0][number];

type ModuleExports = Record<string, unknown> | undefined;

const workspaceRoot = dirname(fileURLToPath(import.meta.url));

const workspaceProjects = (await Promise.all(PROJECT_PATHS.map(loadProjectConfig))).filter(
	isWorkspaceProject,
);

export default defineWorkspace(workspaceProjects);

async function loadProjectConfig(relativePath: string): Promise<WorkspaceProject | null> {
	const absolutePath = resolve(workspaceRoot, relativePath);

	try {
		await access(absolutePath);
	} catch {
		console.warn(`[brAInwav] Skipping ${relativePath} (config file missing)`);
		return null;
	}

	try {
		const moduleExports = (await import(pathToFileURL(absolutePath).href)) as ModuleExports;
		const candidate = extractConfig(moduleExports);

		if (!candidate) {
			console.warn(`[brAInwav] Skipping ${relativePath} (no compatible export found)`);
			return null;
		}

		return mergeWithDefaults(candidate);
	} catch (error) {
		console.warn(
			`[brAInwav] Skipping ${relativePath} (failed to load: ${(error as Error).message})`,
		);
		return null;
	}
}

function extractConfig(moduleExports: ModuleExports): WorkspaceProject | null {
	if (!moduleExports) {
		return null;
	}

	const candidates = [moduleExports.default, ...Object.values(moduleExports)]
		.filter((value) => value && typeof value === 'object')
		.map((value) => value as WorkspaceProject);

	return candidates.find((value) => value && typeof value === 'object' && 'test' in value) ?? null;
}

function mergeWithDefaults(base: WorkspaceProject): WorkspaceProject {
	const mergedTest = {
		...MEMORY_SAFE_DEFAULTS.test,
		...(base.test ?? {}),
		poolOptions: {
			...(MEMORY_SAFE_DEFAULTS.test.poolOptions ?? {}),
			...(base.test?.poolOptions ?? {}),
			forks: {
				...(MEMORY_SAFE_DEFAULTS.test.poolOptions?.forks ?? {}),
				...(base.test?.poolOptions?.forks ?? {}),
			},
		},
	};

	return {
		...MEMORY_SAFE_DEFAULTS,
		...base,
		test: mergedTest,
	};
}

function isWorkspaceProject(value: WorkspaceProject | null): value is WorkspaceProject {
	return value !== null;
}
