import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const emitAuthEventMock = vi.fn();
const dbInsertMock = vi.fn();
const warnMock = vi.fn();

vi.mock('../../services/externalMonitoringService', () => ({
	externalMonitoringService: {
		emitAuthEvent: emitAuthEventMock,
	},
}));

vi.mock('../../db/index', () => ({
	db: {
		insert: dbInsertMock,
	},
}));

vi.mock('../../utils/logger', () => ({
	__esModule: true,
	default: {
		info: vi.fn(),
		warn: warnMock,
		error: vi.fn(),
	},
}));

describe('authMonitoringService integration', () => {
	const ORIGINAL_ENV = { ...process.env };

	beforeEach(() => {
		process.env = { ...ORIGINAL_ENV };
		emitAuthEventMock.mockReset();
		dbInsertMock.mockReset();
		dbInsertMock.mockResolvedValue(undefined);
		warnMock.mockReset();
		vi.resetModules();
	});

	afterEach(() => {
		process.env = { ...ORIGINAL_ENV };
		vi.clearAllMocks();
		vi.resetModules();
	});

	it('delegates auth events to external monitoring service', async () => {
		emitAuthEventMock.mockResolvedValueOnce(undefined);
		const { authMonitoringService } = await import('../../services/authMonitoringService');

		await authMonitoringService.logSuccessfulLogin('user-777', '198.51.100.10', 'TestAgent/2.0');

		expect(emitAuthEventMock).toHaveBeenCalledTimes(1);
		const payload = emitAuthEventMock.mock.calls[0]?.[0];
		expect(payload).toBeDefined();
		expect(payload).toMatchObject({
			userId: 'user-777',
			eventType: 'login',
			ipAddress: '198.51.100.10',
			userAgent: 'TestAgent/2.0',
		});
		expect(payload?.timestamp).toBeInstanceOf(Date);
	});

	it('swallows external monitoring errors and logs warning', async () => {
		const error = new Error('network down');
		emitAuthEventMock.mockRejectedValueOnce(error);
		const { authMonitoringService } = await import('../../services/authMonitoringService');

		await expect(
			authMonitoringService.logFailedLogin('user@example.com', '203.0.113.5', 'Mozilla/5.0'),
		).resolves.toBeUndefined();

		expect(warnMock).toHaveBeenCalledWith(
			'brAInwav auth monitoring external dispatch failure',
			expect.objectContaining({
				eventType: 'failed_login',
				reason: 'network down',
			}),
		);
	});
});
