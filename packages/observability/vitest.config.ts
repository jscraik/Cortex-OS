import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	test: {
		include: ['tests/**/*.test.ts'],
		exclude: ['node_modules/**', 'dist/**', 'build/**', '.next/**'],
	},
	resolve: {
		alias: {
			'@cortex-os/a2a-contracts': resolve(__dirname, '../a2a/a2a-contracts/src'),
			'@cortex-os/a2a-core': resolve(__dirname, '../a2a/a2a-core/src'),
			'@cortex-os/contracts': resolve(
				__dirname,
				'..',
				'..',
				'libs',
				'typescript',
				'contracts',
				'src',
			),
		},
	},
});
