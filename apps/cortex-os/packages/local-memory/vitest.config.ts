/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		include: ['**/__tests__/**/*.spec.ts', '**/__tests__/**/*.test.ts'],
		exclude: ['**/node_modules/**', '**/dist/**'],
	},
	resolve: {
		alias: {
			'@cortex-os/telemetry': '../../../../libs/typescript/telemetry/src/index.ts',
		},
	},
});
