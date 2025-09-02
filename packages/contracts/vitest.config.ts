import { defineConfig } from "vitest/config";

// Local Vitest config to keep test discovery strictly within this package.
// This avoids accidentally running tests from other packages via the root workspace config.
export default defineConfig({
	test: {
		environment: "node",
		include: [
			"src/**/*.test.ts",
			"src/**/*.spec.ts",
			"tests/**/*.test.ts",
			"tests/**/*.spec.ts",
		],
		exclude: ["**/node_modules/**", "**/dist/**", "**/build/**"],
		passWithNoTests: true,
	},
});
