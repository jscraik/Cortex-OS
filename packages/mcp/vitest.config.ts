/**
 * Vitest Configuration for MCP Package
 * Comprehensive test configuration with coverage thresholds
 */

import { defineConfig } from 'vitest/config';

export const mcpVitestConfig = defineConfig({
	test: {
		include: ['**/__tests__/**/*.test.ts', '**/*.spec.ts'],
		globals: true,
		environment: 'node',
		coverage: {
			reporter: ['text', 'json', 'html'],
			exclude: [
				'node_modules/',
				'**/__tests__/**',
				'**/*.test.ts',
				'**/*.spec.ts',
				'**/dist/**',
			],
			thresholds: {
				global: {
					branches: 90,
					functions: 90,
					lines: 90,
					statements: 90,
				},
			},
		},
	},
});
