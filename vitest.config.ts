import { defineConfig } from "vitest/config";

// Root Vitest config: only orchestrates projects. Avoid sweeping up non-Vitest
// suites (e.g., apps using Jest) and vendor/external code.
export default defineConfig({
	test: {
		globals: true,
		// Strict worker limits to prevent memory exhaustion
		fileParallelism: false, // ensure only one file runs at a time
		maxWorkers: 1,
		// Memory management settings
		isolate: true,
		sequence: {
			concurrent: false, // Run tests sequentially to save memory
		},
		// Force garbage collection between test files
		testTimeout: 30000,
		hookTimeout: 30000,
		// Memory leak prevention
		teardownTimeout: 10000,
		// Use forks pool to avoid tinypool thread conflicts in CI/Node 22
		pool: "forks",
		poolOptions: {
			forks: {
				// Enforce a single child process and cap memory per worker
				singleFork: true,
				maxForks: 1,
				minForks: 1,
				execArgv: [
					"--max-old-space-size=2048",
					"--heapsnapshot-near-heap-limit=2",
					"--expose-gc",
				],
			},
		},
		// Ensure built artifacts never get swept into discovery
		exclude: [
			"**/node_modules/**",
			"**/dist/**",
			"**/build/**",
			"**/.next/**",
			"tests/**",
		],
		// Quality gates: enforce coverage thresholds across all projects
		coverage: {
			provider: "v8",
			reporter: ["text-summary", "json-summary", "lcov", "html"],
			include: ["apps/**/src/**", "packages/**/src/**"],
			exclude: [
				"external/**",
				"vendor/**",
				"**/*.test.*",
				"**/*.spec.*",
				"**/node_modules/**",
				"**/dist/**",
				"**/build/**",
				"**/*.config.*",
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
		projects: ["vitest.basic.config.ts"],
		setupFiles: ["tests/setup/vitest.setup.ts"],
		// Quality gates enforcement
		passWithNoTests: false,
		outputFile: {
			junit: "junit.xml",
			json: "test-results.json",
		},
		env: {
			COVERAGE_THRESHOLD_GLOBAL: "90",
			COVERAGE_THRESHOLD_LINES: "95",
			NODE_ENV: "test",
		},
	},
});
