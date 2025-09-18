import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		setupFiles: ['test/setup.ts'],
	},
	resolve: {
		alias: {
			'@cortex-os/telemetry': path.resolve(
				__dirname,
				'../../tests/utils/telemetry-mock.ts',
			),
		},
	},
});
