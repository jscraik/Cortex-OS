import * as path from "node:path";
import { defineConfig } from "vitest/config";

// Package-local Vitest config to avoid inheriting the repo root config.
export default defineConfig({
	test: {
		environment: "node",
		include: [
			"src/**/*.test.ts",
			"src/**/*.spec.ts",
			"src/**/__tests__/**/*.ts",
		],
		globals: true,
		// Keep it fast and isolated
		maxWorkers: 1,
		pool: "forks",
		poolOptions: { forks: { singleFork: true } },
		passWithNoTests: false,
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
});
