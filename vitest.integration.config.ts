import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const integrationConfig = defineConfig({
	// Prevent Vitest from auto-loading root vitest.workspace.ts when using this config
	// workspace array explicitly set to prevent automatic discovery
	workspace: [],
	test: {
		environment: "node",
		include: ["**/integration/**/*.test.ts", "**/integration/**/*.spec.ts"],
		globals: true,
		name: "integration-tests",
		maxConcurrency: 2,
		testTimeout: 30000,
		sequence: {
			shuffle: false,
			concurrent: true,
		},
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

// Default export for Vitest compatibility
export { integrationConfig as default };