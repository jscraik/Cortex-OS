import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		include: ['src/__tests__/**/*.{test,spec}.{ts,tsx}'],
		exclude: ['node_modules', 'dist', '**/*.e2e.{test,spec}.{ts,tsx}'],
		setupFiles: ['./src/test/setup.ts'],
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
                        '@': resolve(__dirname, 'src'),
                        '@/test': resolve(__dirname, 'src/test'),
                        '@/db': resolve(__dirname, 'src/db'),
                        '@cortex-os/telemetry': resolve(
                                __dirname,
                                'src/__tests__/mocks/telemetry.ts',
                        ),
                },
        },
});
