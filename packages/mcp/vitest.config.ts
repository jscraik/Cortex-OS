/**
 * Minimal Vitest configuration placeholder for brAInwav MCP package.
 * Ensures workspace aggregation does not fail when the package has no tests yet.
 */

import { defineConfig } from 'vitest/config';

export const mcpVitestConfig = defineConfig({
	test: {
		include: [],
		globals: true,
		environment: 'node',
	},
});
