import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { prewarm, scheduleHeartbeat } from '../server/warmup.js';

const originalFetch = global.fetch;
const fetchSpy = vi.fn();

beforeEach(() => {
	vi.useFakeTimers();
	fetchSpy.mockReset();
	global.fetch = fetchSpy as unknown as typeof fetch;
});

afterEach(() => {
	global.fetch = originalFetch;
	vi.useRealTimers();
});

describe('warmup utilities', () => {
	it('prewarms each model with zero-token chat call', async () => {
		fetchSpy.mockResolvedValue({ ok: true });
		await prewarm(['llama3.2', 'qwen2.5'], '10m', { baseUrl: 'http://localhost' });
		expect(fetchSpy).toHaveBeenCalledTimes(2);
		const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
		expect(body.options.num_predict).toBe(0);
		expect(body.keep_alive).toBe('10m');
	});

	it('scheduleHeartbeat pings on cadence and stops cleanly', async () => {
		fetchSpy.mockResolvedValue({ ok: true });
		const stop = scheduleHeartbeat(['llama3.2'], 1000, '5m', { baseUrl: 'http://localhost' });
		await vi.advanceTimersByTimeAsync(3000);
		expect(fetchSpy).toHaveBeenCalled();
		const callCount = fetchSpy.mock.calls.length;
		stop();
		await vi.advanceTimersByTimeAsync(3000);
		expect(fetchSpy.mock.calls.length).toBe(callCount);
	});
});
