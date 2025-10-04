import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

import { vitestCommonEnv } from './vitest.env';

const projectRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	root: projectRoot,
	test: {
		environment: 'node',
		include: [
			'__tests__/**/*.{test,spec}.ts',
			'src/**/__tests__/**/*.{test,spec}.ts',
			'src/**/*.{test,spec}.ts',
			'test/**/*.{test,spec,contract}.ts',
		],
		globals: true,
		setupFiles: [resolve(projectRoot, 'src/__tests__/setup.ts')],
		env: vitestCommonEnv,
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json-summary', 'lcov', 'html'],
			include: ['src/**/*.ts'],
			exclude: [
				'src/**/*.test.ts',
				'src/**/*.spec.ts',
				'src/test/**/*',
				'src/__tests__/**/*',
				'**/*.config.*',
			],
			thresholds: {
				global: {
					statements: 90,
					branches: 90,
					functions: 90,
					lines: 95,
				},
			},
			all: true,
			clean: true,
		},
	},
});
