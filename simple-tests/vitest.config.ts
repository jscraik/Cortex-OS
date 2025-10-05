import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

const packageRoot = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(packageRoot, '..');

export default defineConfig({
	test: {
		environment: 'node',
		include: [
			'simple-tests/**/*.test.ts',
			'scripts/ci/__tests__/**/*.test.ts',
			'tests/**/*.spec.ts',
			'tests/**/*.test.ts',
		],
	},
	plugins: [
		tsconfigPaths({ projects: [resolve(repoRoot, 'tsconfig.json')], ignoreConfigErrors: true }),
	],
});
