import { beforeEach, describe, expect, it } from 'vitest';
import { AgentRateLimiter } from '../src/security/rate-limiter.js';

describe('AgentRateLimiter - sliding window behavior', () => {
  let limiter: AgentRateLimiter;

  beforeEach(() => {
    limiter = new AgentRateLimiter({
      windowSizeMs: 60_000,
      maxRequestsPerWindow: 2, // very small window to trigger violations
      burstSize: 100, // high so burst never blocks
      refillRate: 10, // irrelevant given high burst size
      enableBurstProtection: true,
      enableResourceTracking: false, // disable randomness
      blockDurationMs: 5_000,
      cleanupIntervalMs: 60_000,
    });
  });

  it('blocks after repeated sliding-window violations', async () => {
    const agent = 'window-agent';

    // First 2 requests allowed
    expect((await limiter.checkLimit(agent)).allowed).toBe(true);
    expect((await limiter.checkLimit(agent)).allowed).toBe(true);

    // Next requests should violate sliding window and increment blockedRequests
    for (let i = 0; i < 11; i++) {
      const res = await limiter.checkLimit(agent);
      expect(res.allowed).toBe(false);
      expect(res.reason).toMatch(/sliding window|Rate limit exceeded/i);
    }

    const status = limiter.getLimitStatus(agent);
    expect(status).not.toBeNull();
    if (!status) throw new Error('status should not be null');

    expect(status.blockedRequests).toBeGreaterThanOrEqual(11);

    // After >10 violations, agent should be blocked by limiter
    expect(status.isBlocked).toBe(true);
  });
});
