import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

import { vitestCommonEnv } from './vitest.env';

const projectRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	root: projectRoot,
	test: {
		environment: 'node',
		include: ['test/mcp.security.integration.test.ts'],
		globals: true,
		setupFiles: [resolve(projectRoot, 'src/__tests__/setup.ts')],
		env: vitestCommonEnv,
	},
});
