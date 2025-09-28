import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const counterAddSpy = vi.fn();
const createCounterSpy = vi.fn(() => ({ add: counterAddSpy }));

vi.mock('@cortex-os/telemetry', () => ({
	__esModule: true,
	createCounter: createCounterSpy,
}));

const warnSpy = vi.fn();
const infoSpy = vi.fn();

vi.mock('../../utils/logger.js', () => ({
	__esModule: true,
	default: {
		info: infoSpy,
		warn: warnSpy,
		error: vi.fn(),
	},
}));

const mockFetchResponse = (status: number, ok: boolean): Response =>
	({
		ok,
		status,
		statusText: ok ? 'OK' : 'Internal Server Error',
		headers: new Headers(),
		json: async () => ({}),
		text: async () => '',
	}) as Response;

const rejectOnAbort = (signal?: AbortSignal): Promise<Response> =>
	new Promise((_, reject) => {
		if (!signal) {
			reject(new DOMException('Aborted', 'AbortError'));
			return;
		}
		const onAbort = () => {
			signal.removeEventListener('abort', onAbort);
			reject(new DOMException('Aborted', 'AbortError'));
		};
		signal.addEventListener('abort', onAbort, { once: true });
	});

describe('externalMonitoringService.emitAuthEvent', () => {
	const ORIGINAL_ENV = { ...process.env };
	const sampleEvent = {
		userId: 'user-123',
		eventType: 'login' as const,
		ipAddress: '203.0.113.1',
		userAgent: 'TestAgent/1.0',
		metadata: { provider: 'email' },
		timestamp: new Date('2025-09-28T12:00:00.000Z'),
	};

	const ORIGINAL_FETCH = globalThis.fetch;
	let fetchSpy: ReturnType<typeof vi.fn<typeof fetch>>;

	beforeEach(async () => {
		process.env = { ...ORIGINAL_ENV };
		counterAddSpy.mockClear();
		createCounterSpy.mockClear();
		warnSpy.mockClear();
		infoSpy.mockClear();
		vi.resetModules();
		fetchSpy = vi.fn<typeof fetch>().mockResolvedValue(mockFetchResponse(202, true));
		globalThis.fetch = fetchSpy as unknown as typeof fetch;
	});

	afterEach(() => {
		process.env = { ...ORIGINAL_ENV };
		globalThis.fetch = ORIGINAL_FETCH;
		vi.resetModules();
	});

	it('emits events to all configured providers and increments Prometheus counter', async () => {
		process.env.AUTH_MONITORING_DATADOG_API_KEY = 'dd-key';
		process.env.AUTH_MONITORING_NEW_RELIC_ACCOUNT_ID = '12345';
		process.env.AUTH_MONITORING_NEW_RELIC_INSERT_KEY = 'nr-key';
		process.env.AUTH_MONITORING_WEBHOOK_URL = 'https://hooks.brainwav.dev/analytics';
		process.env.AUTH_MONITORING_TIMEOUT_MS = '2000';

		const { externalMonitoringService } = await import(
			'../../services/externalMonitoringService.js'
		);

		await externalMonitoringService.emitAuthEvent(sampleEvent);

		expect(createCounterSpy).toHaveBeenCalledTimes(1);
		expect(counterAddSpy).toHaveBeenCalledWith(1, {
			eventType: 'login',
			actorType: 'user',
			status: 'success',
		});

		expect(fetchSpy).toHaveBeenCalledTimes(3);

		const datadogCall = fetchSpy.mock.calls[0];
		expect(datadogCall?.[0]).toBe('https://api.datadoghq.com/api/v1/events');
		const datadogInit = datadogCall?.[1] as RequestInit;
		expect(datadogInit?.method).toBe('POST');
		expect(datadogInit?.headers).toMatchObject({
			'Content-Type': 'application/json',
			'DD-API-KEY': 'dd-key',
		});
		const datadogBody = JSON.parse((datadogInit?.body as string) || '{}');
		expect(datadogBody.tags).toEqual(expect.arrayContaining(['brAInwav', 'auth', 'event:login']));

		const newRelicCall = fetchSpy.mock.calls[1];
		const newRelicInit = newRelicCall?.[1];
		if (!newRelicInit) {
			throw new Error('Expected New Relic request to be dispatched');
		}
		const newRelicBody = JSON.parse(((newRelicInit.body ?? '') as string) || '[]');
		expect(Array.isArray(newRelicBody)).toBe(true);
		const firstEvent = Array.isArray(newRelicBody) ? newRelicBody[0] : undefined;
		expect(firstEvent).toMatchObject({
			eventType: 'BrAInwavAuthEvent',
			status: 'success',
			actorType: 'user',
		});

		const webhookCall = fetchSpy.mock.calls[2];
		expect(webhookCall?.[0]).toBe('https://hooks.brainwav.dev/analytics');
		const webhookInit = webhookCall?.[1];
		if (!webhookInit) {
			throw new Error('Expected webhook request to be dispatched');
		}
		const webhookBody = JSON.parse(((webhookInit.body ?? '') as string) || '{}');
		expect(webhookBody.eventType).toBe('login');
	});

	it('skips providers without credentials but still increments metrics', async () => {
		process.env.AUTH_MONITORING_NEW_RELIC_ACCOUNT_ID = '12345';
		process.env.AUTH_MONITORING_NEW_RELIC_INSERT_KEY = 'nr-key';

		const { externalMonitoringService } = await import(
			'../../services/externalMonitoringService.js'
		);

		await externalMonitoringService.emitAuthEvent(sampleEvent);

		expect(counterAddSpy).toHaveBeenCalledTimes(1);
		expect(fetchSpy).toHaveBeenCalledTimes(1);
		expect(infoSpy).toHaveBeenCalledWith(
			'external-monitoring: provider skipped for brAInwav auth monitoring',
			expect.objectContaining({ provider: 'datadog', reason: 'missing_credentials' }),
		);
	});

	it('logs warning when provider returns non-ok response but resolves', async () => {
		process.env.AUTH_MONITORING_DATADOG_API_KEY = 'dd-key';

		fetchSpy.mockResolvedValueOnce(mockFetchResponse(500, false));

		const { externalMonitoringService } = await import(
			'../../services/externalMonitoringService.js'
		);

		await expect(externalMonitoringService.emitAuthEvent(sampleEvent)).resolves.toBeUndefined();

		expect(warnSpy).toHaveBeenCalledWith(
			'brAInwav external monitoring provider failure',
			expect.objectContaining({ provider: 'datadog', status: 500 }),
		);
	});

	it('logs warning when webhook request times out but resolves', async () => {
		vi.useFakeTimers();
		try {
			process.env.AUTH_MONITORING_WEBHOOK_URL = 'https://hooks.brainwav.dev/timeout';
			process.env.AUTH_MONITORING_TIMEOUT_MS = '100';

			fetchSpy.mockImplementationOnce((_url: RequestInfo | URL, init?: RequestInit) =>
				rejectOnAbort(init?.signal as AbortSignal | undefined),
			);

			const { externalMonitoringService } = await import(
				'../../services/externalMonitoringService.js'
			);

			const emitPromise = externalMonitoringService.emitAuthEvent(sampleEvent);
			await vi.advanceTimersByTimeAsync(250);
			await expect(emitPromise).resolves.toBeUndefined();
			expect(counterAddSpy).toHaveBeenCalledWith(
				1,
				expect.objectContaining({ status: 'success', actorType: 'user' }),
			);
			expect(warnSpy).toHaveBeenCalledWith(
				'brAInwav external monitoring request error',
				expect.objectContaining({ provider: 'webhook', reason: 'Aborted' }),
			);
		} finally {
			vi.useRealTimers();
		}
	});
});
