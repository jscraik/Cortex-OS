/**
 * @file vitest.policy.config.ts
 * @description Vitest configuration for policy and governance tests
 */

import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		name: "policy-tests",
		include: [".cortex/policy/**/*.test.ts", ".cortex/policy/**/*.spec.ts"],
		globals: true,
		environment: "node",
		testTimeout: 10000,
		pool: "forks",
		poolOptions: {
			forks: {
				minForks: 1,
				maxForks: 2,
			},
		},
		// Isolate policy tests from main test suite
		isolate: true,
		// Enable watch mode for development
		watch: false,
		// Coverage configuration for policy tests
		coverage: {
			provider: "v8",
			reporter: ["text", "json-summary"],
			include: [".cortex/policy/**/*.ts"],
			exclude: ["**/*.test.ts", "**/*.spec.ts", "**/*.d.ts"],
			thresholds: {
				statements: 80,
				branches: 80,
				functions: 80,
				lines: 80,
			},
		},
		// Setup files for policy test environment
		setupFiles: [],
		// Custom reporters for policy validation
		reporters: ["verbose"],
	},
	// TypeScript configuration for policy tests
	esbuild: {
		target: "es2022",
	},
});
