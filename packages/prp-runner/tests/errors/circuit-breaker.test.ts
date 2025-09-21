import { describe, expect, it, vi } from 'vitest';
import { CircuitBreaker, retry } from '../../src/lib/resilience/circuit-breaker';

describe('Circuit Breaker', () => {
    it('opens after threshold and blocks calls until timeout', async () => {
        const cb = new CircuitBreaker({ threshold: 3, timeout: 100 });

        // 3 failures to open
        await expect(cb.call(() => Promise.reject(new Error('fail')))).rejects.toThrow('fail');
        await expect(cb.call(() => Promise.reject(new Error('fail')))).rejects.toThrow('fail');
        await expect(cb.call(() => Promise.reject(new Error('fail')))).rejects.toThrow('fail');

        // Open: should block
        await expect(cb.call(() => Promise.resolve('ok'))).rejects.toThrow('Circuit open');

        // Wait for half-open
        await new Promise((r) => setTimeout(r, 110));

        // Half-open allows a trial call; on success closes
        await expect(cb.call(() => Promise.resolve('ok'))).resolves.toBe('ok');
    });

    it('transitions to half-open after timeout and closes on success', async () => {
        vi.useFakeTimers();
        const cb = new CircuitBreaker({ threshold: 1, timeout: 200 });
        // Open the circuit with one failure
        await expect(cb.call(() => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
        // While open, calls should be blocked
        await expect(cb.call(() => Promise.resolve('ok'))).rejects.toThrow('Circuit open');
        // Advance time to move to half-open
        vi.advanceTimersByTime(210);
        // Next call should be allowed and on success, close the circuit
        await expect(cb.call(() => Promise.resolve('ok'))).resolves.toBe('ok');
        // Restore timers
        vi.useRealTimers();
    });
});

describe('Retry', () => {
    it('retries until success', async () => {
        let n = 0;
        const res = await retry(
            async () => {
                n += 1;
                if (n < 3) throw new Error('nope');
                return 'ok';
            },
            5,
            5,
        );
        expect(res).toBe('ok');
        expect(n).toBe(3);
    });
});
