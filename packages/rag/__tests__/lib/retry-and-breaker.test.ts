import { describe, expect, it, vi } from 'vitest';

// We will import after implementation exists
// import { withRetry } from '../../src/lib/retry.js';
// import { CircuitBreaker } from '../../src/lib/circuit-breaker.js';

function fakeSleepFactory(times: number[] = []) {
    const calls: number[] = [];
    return {
        calls,
        sleep: async (ms: number) => {
            calls.push(ms);
            await Promise.resolve();
        },
        preset: times,
    };
}

describe('withRetry', () => {
    it('retries with exponential backoff and optional jitter callback', async () => {
        const { sleep, calls } = fakeSleepFactory();

        const op = vi
            .fn()
            .mockRejectedValueOnce(new Error('fail-1'))
            .mockRejectedValueOnce(new Error('fail-2'))
            .mockResolvedValue('ok');

        const jitterSpy = vi.fn();

        const { withRetry } = await import('../../src/lib/retry.ts');
        const result = await withRetry(op, { maxAttempts: 3, baseDelayMs: 100, jitter: jitterSpy, sleep });

        expect(result).toBe('ok');
        // two sleeps happened (between attempts)
        expect(calls.length).toBe(2);
        // backoff pattern 100, 200 (no jitter effect checked here)
        expect(calls[0]).toBeGreaterThanOrEqual(100);
        expect(calls[1]).toBeGreaterThanOrEqual(200);
        expect(jitterSpy).toHaveBeenCalledTimes(2);
    });

    it('stops after max attempts and throws last error', async () => {
        const { sleep } = fakeSleepFactory();
        const op = vi
            .fn()
            .mockRejectedValue(new Error('always'));

        const { withRetry } = await import('../../src/lib/retry.ts');
        await expect(withRetry(op, { maxAttempts: 3, baseDelayMs: 10, sleep })).rejects.toThrow('always');
        expect(op).toHaveBeenCalledTimes(3);
    });
});

describe('CircuitBreaker', () => {
    it('opens after failures then half-opens after reset timeout, and recovers on success', async () => {
        const now = { t: 0 };
        const nowFn = () => now.t;

        const { CircuitBreaker } = await import('../../src/lib/circuit-breaker.ts');
        const cb = new CircuitBreaker({ failureThreshold: 2, resetTimeoutMs: 100, now: nowFn });

        const failing = vi.fn(async () => {
            throw new Error('boom');
        });

        // First two calls fail -> threshold reached -> breaker opens
        await expect(cb.execute(failing)).rejects.toThrow('boom');
        await expect(cb.execute(failing)).rejects.toThrow('boom');

        // Now breaker should be open -> immediate rejection
        await expect(cb.execute(async () => 'ok')).rejects.toThrow('Circuit open');

        // Advance time to reset timeout
        now.t += 100;

        // Next call should be attempted (half-open)
        const result = await cb.execute(async () => 'recovered');
        expect(result).toBe('recovered');

        // After success, breaker closes
        const result2 = await cb.execute(async () => 'ok2');
        expect(result2).toBe('ok2');
    });
});
