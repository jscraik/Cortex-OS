/**
 * Minimal Vitest configuration placeholder for brAInwav MVP core package.
 */

import { defineConfig } from 'vitest/config';

export const mvpCoreVitestConfig = defineConfig({
	test: {
		include: [],
		globals: true,
		environment: 'node',
	},
});
