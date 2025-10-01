import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const packageRoot = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(packageRoot, '..', '..');

const aliasPackages: Array<{ scope: string; pathSegments: string[] }> = [
	{ scope: 'observability', pathSegments: ['packages', 'observability'] },
	{ scope: 'orchestration', pathSegments: ['packages', 'orchestration'] },
];

export default defineConfig({
	resolve: {
		alias: aliasPackages.flatMap(({ scope, pathSegments }) => {
			const sourceRoot = resolve(repoRoot, ...pathSegments, 'src');

			return [
				{
					find: `@cortex-os/${scope}`,
					replacement: resolve(sourceRoot, 'index.ts'),
				},
				{
					find: new RegExp(`^@cortex-os/${scope}/(.*)$`),
					replacement: `${sourceRoot}/$1`,
				},
			];
		}),
	},
	test: {
		environment: 'node',
		include: ['./tests/**/*.test.ts'],
		setupFiles: ['tests/setup.global.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text-summary', 'json-summary'],
			thresholds: {
				global: {
					statements: 80,
					branches: 80,
					functions: 80,
					lines: 80,
				},
			},
		},
	},
});
