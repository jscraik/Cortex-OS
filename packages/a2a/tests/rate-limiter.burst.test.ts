import { beforeEach, describe, expect, it } from 'vitest';
import { AgentRateLimiter } from '../src/security/rate-limiter.js';

describe('AgentRateLimiter - burst protection metrics', () => {
  let limiter: AgentRateLimiter;

  beforeEach(() => {
    limiter = new AgentRateLimiter({
      windowSizeMs: 60_000,
      maxRequestsPerWindow: 1000,
      burstSize: 3, // small burst for test
      refillRate: 0, // no refill to make behavior deterministic
      enableBurstProtection: true,
      enableResourceTracking: false,
      blockDurationMs: 5_000,
      cleanupIntervalMs: 60_000,
    });
  });

  it('increments request counters and blockedRequests when burst exceeded', async () => {
    const agent = 'test-agent';
    // First 3 requests should be allowed (burst tokens 3 -> 0)
    for (let i = 0; i < 3; i++) {
      const res = await limiter.checkLimit(agent, 'default');
      expect(res.allowed).toBe(true);
    }

    // 4th request should be blocked by burst protection
    const blocked = await limiter.checkLimit(agent, 'default');
    expect(blocked.allowed).toBe(false);
    expect(blocked.reason).toMatch(/Burst limit exceeded/);

    // Verify internal counters via getLimitStatus
    const status = limiter.getLimitStatus(agent, 'default');
    expect(status).not.toBeNull();
    if (!status) throw new Error('Rate limit status should not be null');
    expect(status.requests).toBe(3);
    expect(status.totalRequests).toBe(3);
    expect(status.burstTokens).toBe(0);
    expect(status.blockedRequests).toBeGreaterThan(0);
  });
});
