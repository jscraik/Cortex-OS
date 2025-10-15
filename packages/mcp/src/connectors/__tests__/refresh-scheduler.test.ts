import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RefreshScheduler } from '../refresh-scheduler.js';

const createLogger = () => ({
	info: vi.fn(),
	warn: vi.fn(),
	debug: vi.fn(),
	error: vi.fn(),
});

const createRandom = (...values: number[]) => {
	const sequence = [...values];
	return {
		next: vi.fn(() => {
			const value = sequence.shift();
			if (value === undefined) {
				return 0.5;
			}
			return value;
		}),
	};
};

describe('RefreshScheduler', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.clearAllMocks();
	});

	it('schedules refresh with jitter applied', async () => {
		const onRefresh = vi.fn().mockResolvedValue(undefined);
		const logger = createLogger();
		const random = createRandom(0); // min jitter

		const scheduler = new RefreshScheduler({
			intervalMs: 1_000,
			jitterFactor: 0.2,
			onRefresh,
			logger,
			random,
			clock: { now: () => 0 },
		});

		scheduler.start();
		expect(onRefresh).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(800);
		expect(onRefresh).toHaveBeenCalledTimes(1);

		random.next.mockReturnValueOnce(1); // max jitter
		await vi.advanceTimersByTimeAsync(1_200);
		expect(onRefresh).toHaveBeenCalledTimes(2);
	});

	it('forceRefresh executes immediately without scheduling delay', async () => {
		const onRefresh = vi.fn().mockResolvedValue(undefined);
		const logger = createLogger();

		const scheduler = new RefreshScheduler({
			intervalMs: 1_000,
			onRefresh,
			logger,
			random: createRandom(0.5),
			clock: { now: () => 0 },
		});

		await scheduler.forceRefresh();

		expect(onRefresh).toHaveBeenCalledTimes(1);
	});

	it('gracefully handles onRefresh errors and continues scheduling', async () => {
		const logger = createLogger();
		const onRefresh = vi
			.fn()
			.mockRejectedValueOnce(new Error('boom'))
			.mockResolvedValueOnce(undefined);

		const scheduler = new RefreshScheduler({
			intervalMs: 500,
			onRefresh,
			logger,
			random: createRandom(0.5),
			clock: { now: () => 0 },
		});

		scheduler.start();
		await vi.advanceTimersByTimeAsync(500);

		expect(onRefresh).toHaveBeenCalledTimes(1);
		expect(logger.warn).toHaveBeenCalledWith(
			expect.objectContaining({ brand: 'brAInwav' }),
			'Refresh failed',
		);

		await vi.advanceTimersByTimeAsync(500);
		expect(onRefresh).toHaveBeenCalledTimes(2);
		expect(logger.info).toHaveBeenCalledWith(
			expect.objectContaining({ brand: 'brAInwav' }),
			'Refresh completed',
		);
	});

	it('start is idempotent and stop cancels timers', async () => {
		const onRefresh = vi.fn().mockResolvedValue(undefined);
		const logger = createLogger();

		const scheduler = new RefreshScheduler({
			intervalMs: 1_000,
			onRefresh,
			logger,
			random: createRandom(0.5),
			clock: { now: () => 0 },
		});

		scheduler.start();
		scheduler.start();

		await vi.advanceTimersByTimeAsync(1_000);
		expect(onRefresh).toHaveBeenCalledTimes(1);

		scheduler.stop();
		await vi.advanceTimersByTimeAsync(1_000);
		expect(onRefresh).toHaveBeenCalledTimes(1);
	});
});
