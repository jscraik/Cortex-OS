import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

if (!process.env.ROLLUP_SKIP_NATIVE_BUILD) {
	process.env.ROLLUP_SKIP_NATIVE_BUILD = 'true';
}

if (!process.env.ROLLUP_SKIP_NATIVE) {
	process.env.ROLLUP_SKIP_NATIVE = 'true';
}

const packageRoot = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(packageRoot, '..', '..');

const aliasPackages: Array<{ scope: string; pathSegments: string[] }> = [
	{ scope: 'observability', pathSegments: ['packages', 'observability'] },
	{ scope: 'orchestration', pathSegments: ['packages', 'orchestration'] },
	{ scope: 'commands', pathSegments: ['packages', 'commands'] },
	{ scope: 'kernel', pathSegments: ['packages', 'kernel'] },
	{ scope: 'hooks', pathSegments: ['packages', 'hooks'] },
	{ scope: 'agent-contracts', pathSegments: ['libs', 'typescript', 'agent-contracts'] },
	{ scope: 'cortex-sec', pathSegments: ['packages', 'cortex-sec'] },
];

const appsSourceRoot = resolve(repoRoot, 'apps', 'cortex-os');

export default defineConfig({
	plugins: [tsconfigPaths({ projects: [resolve(repoRoot, 'tsconfig.json')] })],
	resolve: {
		alias: [
			...aliasPackages.flatMap(({ scope, pathSegments }) => {
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
			{
				find: '@apps/cortex-os',
				replacement: appsSourceRoot,
			},
			{
				find: /^@apps\/cortex-os\/(.*)$/,
				replacement: `${appsSourceRoot}/$1`,
			},
		],
	},
	test: {
		environment: 'node',
		include: ['./tests/**/*.test.ts'],
		setupFiles: [resolve(appsSourceRoot, 'tests/setup.global.ts')],
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
