import { describe, expect, it } from 'vitest';
import { createTokenBucket, TokenBucket } from '../src/lib/rate-limiter.js';

describe('TokenBucket rate limiter', () => {
    it('allows bursts up to capacity and then blocks', () => {
        const tb = createTokenBucket({ capacity: 3, refillPerSecond: 0, now: () => 0 });
        expect(tb.tryRemove()).toBe(true);
        expect(tb.tryRemove()).toBe(true);
        expect(tb.tryRemove()).toBe(true);
        expect(tb.tryRemove()).toBe(false);
    });

    it('refills over time', () => {
        let t = 0;
        const tb = new TokenBucket({ capacity: 2, refillPerSecond: 1, now: () => t });
        expect(tb.tryRemove()).toBe(true); // 1 left
        expect(tb.tryRemove()).toBe(true); // 0 left
        expect(tb.tryRemove()).toBe(false);
        t += 500; // 0.5 tokens added
        expect(tb.tryRemove()).toBe(false); // not enough yet
        t += 500; // now 1 token
        expect(tb.tryRemove()).toBe(true);
    });

    it('caps at capacity when refilling', () => {
        let t = 0;
        const tb = new TokenBucket({ capacity: 5, refillPerSecond: 10, now: () => t });
        // drain
        for (let i = 0; i < 5; i++) expect(tb.tryRemove()).toBe(true);
        expect(tb.tryRemove()).toBe(false);
        // wait long enough to overfill if uncapped
        t += 1000; // 10 tokens would be added but cap is 5
        expect(tb.available).toBeCloseTo(5, 5);
    });
});
