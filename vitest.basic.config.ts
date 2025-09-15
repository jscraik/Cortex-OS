import * as path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	// Prevent Vitest from auto-loading root vitest.workspace.ts when using this config
	// See: https://vitest.dev/config/#workspace (deprecated) — setting an explicit empty array disables discovery

	test: {
		environment: "node",
		include: [
			"simple-tests/**/*.test.ts",
			"libs/typescript/contracts/tests/**/*.contract.test.ts"
		],
		globals: true,
		name: "simple-tests",
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "lcov"],
			include: [
				"simple-tests/agent-isolation-sandbox-impl.ts",
				"libs/typescript/contracts/src/sandbox-audit-events.ts"
			],
			thresholds: {
				statements: 80,
				branches: 70,
				functions: 80,
				lines: 80
			}
		}
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./"),
			"~": path.resolve(__dirname, "./"),
		},
	},
	esbuild: {
		target: "node18",
	},
});
