import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../backend/src/utils/logger', () => ({
	default: {
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		debug: vi.fn(),
	},
}));

let HealthService: typeof import('../backend/src/services/healthService').HealthService;

describe('environment health check', () => {
	const originalEnv = { ...process.env };

	beforeEach(async () => {
		process.env = { ...originalEnv };
		vi.resetModules();
		({ HealthService } = await import('../backend/src/services/healthService'));
	});

	it('fails when required environment variables are missing', async () => {
		delete process.env.JWT_SECRET;
		delete process.env.MODEL_API_KEY;

		const service = HealthService.getInstance();
		const result = await service.performHealthCheck();
		const envCheck = result.checks.environment;

		expect(envCheck.status).toBe('fail');
		expect(envCheck.message).toContain('JWT_SECRET');
		expect(envCheck.message).toContain('MODEL_API_KEY');
	});

	it('warns when JWT_SECRET is too short', async () => {
		process.env.JWT_SECRET = 'short-secret';
		process.env.MODEL_API_KEY = 'key';

		const service = HealthService.getInstance();
		const result = await service.performHealthCheck();
		const envCheck = result.checks.environment;

		expect(envCheck.status).toBe('warn');
		expect(envCheck.message).toMatch(/at least 32 characters/);
	});

	it('passes when all required environment variables are properly set', async () => {
		process.env.JWT_SECRET = 'a'.repeat(32);
		process.env.MODEL_API_KEY = 'key';

		const service = HealthService.getInstance();
		const result = await service.performHealthCheck();
		const envCheck = result.checks.environment;

		expect(envCheck.status).toBe('pass');
	});
});
