import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'node',
		include: ['test/mcp.security.integration.test.ts'],
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
			BRAINWAV_API_KEY: 'brainwav-test-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
			CSRF_SECRET: 'brainwav-test-csrf-secret-aaaaaaaaaaaaaaaa',
			SESSION_SECRET: 'brainwav-test-session-secret-aaaaaaaaaaaaaa',
			SECURITY_HEADERS_ENABLED: 'false',
			ENABLE_SECURITY_LOGGING: 'false',
			BASE_URL: 'http://localhost:3000',
		},
	},
});
