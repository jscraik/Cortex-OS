/**
 * Minimal Vitest configuration placeholder for brAInwav MVP server package.
 */

import { defineConfig } from 'vitest/config';

export const mvpServerVitestConfig = defineConfig({
	test: {
		include: [],
		globals: true,
		environment: 'node',
	},
});
