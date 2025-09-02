import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Root Vitest config: only orchestrates projects. Avoid sweeping up non-Vitest
// suites (e.g., apps using Jest) and vendor/external code.
export default defineConfig({
	test: {
		globals: true,
		// Strict worker limits to prevent memory exhaustion
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
				singleFork: true,
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
		// Route to explicit project configs for proper isolation; filter to only
		// include configs that actually exist on disk to avoid startup errors
		// when packages are missing or in migration.
		projects: (() => {
			// Resolve candidates relative to this config file (repo root),
			// not the process cwd (which may be a package folder when invoked via Nx).
			const configDir = path.dirname(fileURLToPath(import.meta.url));
			const candidates = [
				// Minimal test suite to ensure vitest runs without external dependencies
				path.join(configDir, "vitest.basic.config.ts"),
			];

			const existing = candidates.filter((abs) => fs.existsSync(abs));
			const missing = candidates.filter((abs) => !fs.existsSync(abs));
			if (missing.length > 0) {
				// Use console.warn so it's visible during CI/test runs
				// but do not fail the test startup because of missing per-package configs.
				// eslint-disable-next-line no-console
				console.warn(
					"[vitest.config] Missing project configs:",
					missing.map((m) => path.relative(configDir, m)),
				);
			}
			// Return absolute paths so Vitest can locate them regardless of CWD
			return existing;
		})(),
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
