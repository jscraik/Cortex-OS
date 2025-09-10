import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	resolve: {
		alias: {
			'@cortex-os/utils': path.resolve(
				__dirname,
				'../../../../../libs/typescript/utils/src/index.ts',
			),
		},
	},
});
