import * as path from 'node:path';
import { defineConfig } from 'vitest/config';
import { resolveCoverageThresholds } from './vitest.config';

const coverageThresholds = resolveCoverageThresholds();

export default defineConfig({
	// Prevent Vitest from auto-loading root vitest.workspace.ts when using this config
	// See: https://vitest.dev/config/#workspace (deprecated) — setting an explicit empty array disables discovery

	test: {
		environment: 'node',
		include: [
			'simple-tests/**/*.test.ts',
			'libs/typescript/contracts/tests/**/*.contract.test.ts',
			'services/orchestration/tests/**/*.spec.ts',
			'services/memories/tests/**/*.spec.ts',
			'services/agents/tests/**/*.spec.ts',
			'scripts/ci/__tests__/**/*.test.ts',
			'tests/tdd-coach/**/*.test.ts',
		],
		globals: true,
		name: 'simple-tests',
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'json-summary', 'lcov'],
			include: [
				'simple-tests/agent-isolation-sandbox-impl.ts',
				'libs/typescript/contracts/src/sandbox-audit-events.ts',
				'scripts/ci/quality-gate-enforcer.ts',
				'scripts/ci/baseline-metrics.ts',
			],
			thresholds: {
				statements: coverageThresholds.statements,
				branches: coverageThresholds.branches,
				functions: coverageThresholds.functions,
				lines: coverageThresholds.lines,
			},
		},
	},
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './'),
			'~': path.resolve(__dirname, './'),
		},
	},
	esbuild: {
		target: 'node18',
	},
});
