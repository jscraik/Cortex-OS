import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: { environment: 'node' },
	resolve: {
		alias: {
			'@cortex-os/telemetry': resolve(__dirname, '../../tests/utils/telemetry-mock.ts'),
			'@cortex-os/contracts': resolve(__dirname, './tests/contracts-shim.ts'),
			'@cortex-os/a2a-core': resolve(__dirname, './a2a-core/src'),
			'@cortex-os/a2a-contracts': resolve(__dirname, './a2a-contracts/src'),
		},
	},
});
