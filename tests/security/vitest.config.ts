import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		root: path.resolve(__dirname),
		include: ["**/*.test.ts"],
		environment: "node",
		coverage: {
			provider: "v8",
			reporter: ["text-summary", "lcov"],
			include: ["../../packages/**/src/**"],
		},
	},
});
