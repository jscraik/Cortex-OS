import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

const packageRoot = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(packageRoot, '..', '..');

export default defineConfig({
	plugins: [tsconfigPaths({ projects: [resolve(repoRoot, 'tsconfig.json')] })],
	test: {
		globals: true,
		environment: 'node',
		include: ['__tests__/**/*.test.ts', 'src/**/*.test.ts'],
		exclude: ['node_modules', 'dist'],
	},
	resolve: {
		alias: {
			'@': './src',
			'@cortex-os/a2a-core': resolve(__dirname, '../a2a/a2a-core/src'),
			'@cortex-os/a2a-contracts': resolve(__dirname, '../a2a/a2a-contracts/src'),
			'@cortex-os/a2a-transport': resolve(__dirname, '../a2a/a2a-transport/src'),
			'@cortex-os/contracts': resolve(__dirname, '../../libs/typescript/contracts/src/index.ts'),
		},
	},
});
