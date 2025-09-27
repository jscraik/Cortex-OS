import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

const packageRoot = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(packageRoot, '..', '..');

const aliasPackages: Array<{ scope: string; pathSegments: string[] }> = [
	{ scope: 'a2a-contracts', pathSegments: ['packages', 'a2a', 'a2a-contracts'] },
	{ scope: 'a2a-core', pathSegments: ['packages', 'a2a', 'a2a-core'] },
	{ scope: 'a2a-events', pathSegments: ['packages', 'a2a', 'a2a-events'] },
	{ scope: 'a2a-transport', pathSegments: ['packages', 'a2a', 'a2a-transport'] },
	{ scope: 'mcp-core', pathSegments: ['packages', 'mcp-core'] },
];

export default defineConfig({
	root: packageRoot,
	resolve: {
		alias: aliasPackages.flatMap(({ scope, pathSegments }) => {
			const sourceRoot = resolve(repoRoot, ...pathSegments, 'src');

			return [
				{
					find: new RegExp(`^@cortex-os/${scope}/(.*)$`),
					replacement: `${sourceRoot}/$1`,
				},
				{
					find: `@cortex-os/${scope}`,
					replacement: resolve(sourceRoot, 'index.ts'),
				},
			];
		}),
	},
	plugins: [
		tsconfigPaths({
			projects: [resolve(packageRoot, 'tsconfig.vitest.json')],
		}),
	],
	test: {
		globals: true,
		include: ['tests/**/*.{test,spec}.ts'],
		setupFiles: [resolve(packageRoot, 'tests', 'setup', 'bcrypt-mock.ts')],
		testTimeout: 120_000,
		hookTimeout: 120_000,
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json-summary'],
			reportsDirectory: 'coverage',
			thresholds: {
				statements: 90,
				branches: 90,
				functions: 90,
				lines: 90,
			},
		},
	},
});
