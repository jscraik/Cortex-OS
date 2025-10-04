import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

import { vitestCommonEnv } from './vitest.env';

const projectRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	root: projectRoot,
	test: {
		globals: true,
		environment: 'node',
		include: ['src/__tests__/**/*.{test,spec}.{ts,tsx}'],
		exclude: ['node_modules', 'dist', '**/*.e2e.{test,spec}.{ts,tsx}'],
		setupFiles: [resolve(projectRoot, 'src/test/setup.ts')],
		env: vitestCommonEnv,
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			exclude: [
				'node_modules/',
				'src/test/',
				'src/db/migrations/',
				'**/*.test.ts',
				'**/*.spec.ts',
				'**/*.config.*',
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
		reporters: ['default', 'vitest-sonar-reporter'],
		outputFile: {
			'vitest-sonar-reporter': 'test-results/sonar-report.xml',
		},
	},
	resolve: {
		alias: {
			'@': resolve(projectRoot, 'src'),
			'@/test': resolve(projectRoot, 'src/test'),
			'@/db': resolve(projectRoot, 'src/db'),
			'@cortex-os/telemetry': resolve(projectRoot, 'src/__tests__/mocks/telemetry.ts'),
		},
	},
});
