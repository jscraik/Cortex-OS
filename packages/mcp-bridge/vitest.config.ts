import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
	resolve: {
		alias: {
			// Point package import to source to avoid workspace install
			"@cortex-os/contracts": path.resolve(
				__dirname,
				"../../libs/typescript/contracts/src/index.ts",
			),
		},
	},
	test: {
		include: ["tests/**/*.vitest.ts", "src/**/*.test.ts"],
		globals: true,
		environment: "node",
		setupFiles: ["tests/setup.ts"],
	},
});
