import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'node',
		include: [
			'__tests__/**/*.{test,spec}.ts',
			'src/**/__tests__/**/*.{test,spec}.ts',
			'src/**/*.{test,spec}.ts',
			'test/**/*.{test,spec,contract}.ts',
		],
		globals: true,
		setupFiles: ['./src/__tests__/setup.ts'],
		env: {
			NODE_ENV: 'test',
			DATABASE_PATH: ':memory:',
			DATABASE_URL: 'sqlite::memory:',
			JWT_SECRET: 'test-jwt-secret-key-for-testing-only-32-chars',
			BETTER_AUTH_SECRET: 'test-better-auth-secret-for-testing-only-32-chars',
			LOG_LEVEL: 'error',
			OPENAI_API_KEY: 'test-key',
			ANTHROPIC_API_KEY: 'test-key',
		},
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
