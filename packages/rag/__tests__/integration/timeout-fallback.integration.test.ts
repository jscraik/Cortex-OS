import { describe, expect, it } from 'vitest';

function withTimeout<T>(op: Promise<T>, ms: number, onTimeout: () => T | Promise<T>): Promise<T> {
    return new Promise<T>((resolve) => {
        let settled = false;
        const timer = setTimeout(async () => {
            if (settled) return;
            settled = true;
            resolve(await onTimeout());
        }, ms);
        op
            .then((v) => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                resolve(v);
            })
            .catch(() => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                // fallback on error as well
                Promise.resolve(onTimeout()).then(resolve);
            });
    });
}

describe('timeout fallback integration', () => {
    it('falls back when the operation exceeds timeout', async () => {
        // An operation that never resolves
        const never = new Promise<string>(() => { /* never resolves */ });

        const start = Date.now();
        const result = await withTimeout(never, 100, () => 'fallback');
        const elapsed = Date.now() - start;

        expect(result).toBe('fallback');
        // generous bound to avoid flakiness
        expect(elapsed).toBeLessThan(500);
    });

    it('falls back on rejection within the timeout window', async () => {
        const op = Promise.reject(new Error('boom')) as Promise<string>;
        const start = Date.now();
        const result = await withTimeout(op, 200, () => 'fallback');
        const elapsed = Date.now() - start;
        expect(result).toBe('fallback');
        expect(elapsed).toBeLessThan(500);
    });
});
