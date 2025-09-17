import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const projectRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	test: {
		root: projectRoot,
		include: [join('mvp', 'src', '**', '*.{spec,test}.{ts,tsx,js,jsx}')],
		environment: 'node',
		globals: true,
	},
});
