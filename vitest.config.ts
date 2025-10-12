import { defineConfig } from 'vitest/config';

const parseThreshold = (value: string | undefined, fallback: number) => {
	const parsed = Number.parseInt(value ?? '', 10);
	return Number.isNaN(parsed) ? fallback : parsed;
};

export const resolveCoverageThresholds = (env: NodeJS.ProcessEnv = process.env) => {
	const globalDefault = parseThreshold(env.COVERAGE_THRESHOLD_GLOBAL, 90);
	const statements = parseThreshold(env.COVERAGE_THRESHOLD_STATEMENTS, globalDefault);
	const branches = parseThreshold(env.COVERAGE_THRESHOLD_BRANCHES, globalDefault);
	const functions = parseThreshold(env.COVERAGE_THRESHOLD_FUNCTIONS, globalDefault);
	const linesGlobalFallback = parseThreshold(env.COVERAGE_THRESHOLD_GLOBAL, 95);
	const lines = parseThreshold(env.COVERAGE_THRESHOLD_LINES, linesGlobalFallback);

	return {
		statements,
		branches,
		functions,
		lines,
	};
};

const coverageThresholds = resolveCoverageThresholds();

// Root Vitest config: only orchestrates projects. Avoid sweeping up non-Vitest
// suites (e.g., apps using Jest) and vendor/external code.
export default defineConfig({
	test: {
		globals: true,
	// Optimized performance settings with memory safety
		fileParallelism: true, // Enable parallel file execution
		maxWorkers: 4, // Increased from 1 for better performance
		// Memory management settings
		isolate: true,
		sequence: {
			concurrent: true, // Enable concurrent execution with controlled memory
		},
		// Force garbage collection between test files
		testTimeout: 20000, // Reduced to prevent hanging processes
		hookTimeout: 20000,
		// Memory leak prevention - aggressive timeouts
		teardownTimeout: 5000,
		// Use forks pool to avoid tinypool thread conflicts in CI/Node 22
		pool: 'forks',
		poolOptions: {
			forks: {
				// Optimized fork configuration for performance
				singleFork: false,
				maxForks: 4,
				minForks: 2,
				execArgv: [
					'--max-old-space-size=2048', // Balanced memory allocation
					'--heapsnapshot-near-heap-limit=2', // Moderate heap monitoring
					'--expose-gc',
					'--max-semi-space-size=128', // Increased young generation space
					'--optimize-for-size', // Keep memory optimization
				],
			},
		},
		// Ensure built artifacts never get swept into discovery
		exclude: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.next/**'],
		// Quality gates: enforce coverage thresholds across all projects
		coverage: {
			provider: 'v8',
			reporter: ['text-summary', 'json-summary', 'lcov', 'html'],
			include: ['apps/**/src/**', 'packages/**/src/**'],
			exclude: [
				'external/**',
				'vendor/**',
				'**/*.test.*',
				'**/*.spec.*',
				'**/node_modules/**',
				'**/dist/**',
				'**/build/**',
				'**/*.config.*',
			],
			thresholds: {
				global: coverageThresholds,
				perFile: false, // Enforced at app level
			},
			all: true,
			clean: true,
		},
		// Route to explicit project config for proper isolation.
		// Use a relative path that Vitest resolves from the repo root.
		// @ts-expect-error projects is supported by Vitest at runtime
		tests: {
			// This is a placeholder to satisfy the defineConfig function
			// Test execution is handled by project-specific configurations
		},
		projects: ['vitest.basic.config.ts'],
		setupFiles: ['tests/setup/vitest.setup.ts', 'tests/tdd-setup.ts'],
		// Quality gates enforcement
		passWithNoTests: false,
		outputFile: {
			junit: 'junit.xml',
			json: 'test-results.json',
		},
		env: {
			COVERAGE_THRESHOLD_GLOBAL: '90',
			COVERAGE_THRESHOLD_STATEMENTS: '90',
			COVERAGE_THRESHOLD_BRANCHES: '90',
			COVERAGE_THRESHOLD_FUNCTIONS: '90',
			COVERAGE_THRESHOLD_LINES: '95',
			NODE_ENV: 'test',
		},
	},
});
