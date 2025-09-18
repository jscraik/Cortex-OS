import { defineConfig } from 'vitest/config';

// Root Vitest config: only orchestrates projects. Avoid sweeping up non-Vitest
// suites (e.g., apps using Jest) and vendor/external code.
export default defineConfig({
	test: {
		globals: true,
		// EMERGENCY MEMORY CONSTRAINTS - NEVER REMOVE OR BYPASS
		fileParallelism: false, // ensure only one file runs at a time
		maxWorkers: 1, // CRITICAL: prevents multiple memory-hungry processes
		// Memory management settings
		isolate: true,
		sequence: {
			concurrent: false, // Run tests sequentially to save memory
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
				// CRITICAL: single fork with strict memory limits
				singleFork: true,
				maxForks: 1,
				minForks: 1,
				execArgv: [
					'--max-old-space-size=1536', // Reduced from 2048 to prevent system freeze
					'--heapsnapshot-near-heap-limit=1', // More aggressive heap monitoring
					'--expose-gc',
					'--max-semi-space-size=64', // Limit young generation space
					'--optimize-for-size', // Optimize for memory usage over speed
				],
			},
		},
		// Ensure built artifacts never get swept into discovery
		exclude: [
			'**/node_modules/**',
			'**/dist/**',
			'**/build/**',
			'**/.next/**',
			'tests/**',
		],
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
				global: {
					statements: 90,
					branches: 90,
					functions: 90,
					lines: 90,
				},
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
		setupFiles: ['tests/setup/vitest.setup.ts'],
		// Quality gates enforcement
		passWithNoTests: false,
		outputFile: {
			junit: 'junit.xml',
			json: 'test-results.json',
		},
		env: {
			COVERAGE_THRESHOLD_GLOBAL: '90',
			COVERAGE_THRESHOLD_LINES: '95',
			NODE_ENV: 'test',
		},
	},
});
