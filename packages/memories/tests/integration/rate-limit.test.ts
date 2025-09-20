import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InMemoryStore } from '../../src/adapters/store.memory.js';
import { RateLimitedMemoryStore } from '../../src/adapters/store.rate-limit.js';
import { createMemory } from '../test-utils.js';
import type { Memory } from '../../src/domain/types.js';

describe('RateLimitedMemoryStore', () => {
  let baseStore: InMemoryStore;
  let rateLimitedStore: RateLimitedMemoryStore;
  let namespace: string;
  let clock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    baseStore = new InMemoryStore();
    namespace = 'test-' + Math.random().toString(36).substring(7);

    // Mock Date.now for testing time-based limits
    clock = vi.useFakeTimers();
    clock.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
  });

  afterEach(async () => {
    clock.useRealTimers();
    // Clean up
    const allMemories = await baseStore.list(namespace);
    for (const memory of allMemories) {
      await baseStore.delete(memory.id, namespace);
    }
  });

  describe('Rate Limiting Strategies', () => {
    it('should enforce fixed window rate limiting', async () => {
      // Configure with 5 requests per minute
      rateLimitedStore = new RateLimitedMemoryStore(baseStore, {
        strategy: 'fixed-window',
        limit: 5,
        windowSize: 60000, // 1 minute
        namespace
      });

      // Make 5 requests (should succeed)
      for (let i = 0; i < 5; i++) {
        const memory = createMemory({ text: `Memory ${i}` });
        await expect(rateLimitedStore.upsert(memory, namespace)).resolves.not.toThrow();
      }

      // 6th request should be rate limited
      const memory6 = createMemory({ text: 'Memory 6' });
      await expect(rateLimitedStore.upsert(memory6, namespace)).rejects.toThrow('Rate limit exceeded');
    });

    it('should enforce sliding window rate limiting', async () => {
      rateLimitedStore = new RateLimitedMemoryStore(baseStore, {
        strategy: 'sliding-window',
        limit: 3,
        windowSize: 10000, // 10 seconds
        namespace
      });

      // Make 3 requests
      for (let i = 0; i < 3; i++) {
        const memory = createMemory({ text: `Memory ${i}` });
        await rateLimitedStore.upsert(memory, namespace);
      }

      // Advance time by 5 seconds
      clock.advanceTimeByTime(5000);

      // 4th request should still be rate limited (sliding window)
      const memory4 = createMemory({ text: 'Memory 4' });
      await expect(rateLimitedStore.upsert(memory4, namespace)).rejects.toThrow('Rate limit exceeded');

      // Advance time by 6 more seconds (total 11 seconds)
      clock.advanceTimeByTime(6000);

      // Now request should succeed
      const memory5 = createMemory({ text: 'Memory 5' });
      await expect(rateLimitedStore.upsert(memory5, namespace)).resolves.not.toThrow();
    });

    it('should enforce token bucket rate limiting', async () => {
      rateLimitedStore = new RateLimitedMemoryStore(baseStore, {
        strategy: 'token-bucket',
        limit: 5, // bucket capacity
        refillRate: 2, // tokens per second
        namespace
      });

      // Make 5 requests (use all tokens)
      for (let i = 0; i < 5; i++) {
        const memory = createMemory({ text: `Memory ${i}` });
        await rateLimitedStore.upsert(memory, namespace);
      }

      // 6th request should be rate limited
      const memory6 = createMemory({ text: 'Memory 6' });
      await expect(rateLimitedStore.upsert(memory6, namespace)).rejects.toThrow('Rate limit exceeded');

      // Wait 1 second (should get 2 tokens)
      clock.advanceTimeByTime(1000);

      // Should be able to make 2 more requests
      const memory7 = createMemory({ text: 'Memory 7' });
      const memory8 = createMemory({ text: 'Memory 8' });
      await expect(rateLimitedStore.upsert(memory7, namespace)).resolves.not.toThrow();
      await expect(rateLimitedStore.upsert(memory8, namespace)).resolves.not.toThrow();

      // 9th request should be rate limited again
      const memory9 = createMemory({ text: 'Memory 9' });
      await expect(rateLimitedStore.upsert(memory9, namespace)).rejects.toThrow('Rate limit exceeded');
    });

    it('should enforce leaky bucket rate limiting', async () => {
      rateLimitedStore = new RateLimitedMemoryStore(baseStore, {
        strategy: 'leaky-bucket',
        limit: 3, // bucket capacity
        leakRate: 1, // requests per second
        namespace
      });

      // Make 3 requests (fill bucket)
      for (let i = 0; i < 3; i++) {
        const memory = createMemory({ text: `Memory ${i}` });
        await rateLimitedStore.upsert(memory, namespace);
      }

      // 4th request should be rate limited
      const memory4 = createMemory({ text: 'Memory 4' });
      await expect(rateLimitedStore.upsert(memory4, namespace)).rejects.toThrow('Rate limit exceeded');

      // Wait 2 seconds (leak 2 requests)
      clock.advanceTimeByTime(2000);

      // Should be able to make 2 more requests
      const memory5 = createMemory({ text: 'Memory 5' });
      const memory6 = createMemory({ text: 'Memory 6' });
      await expect(rateLimitedStore.upsert(memory5, namespace)).resolves.not.toThrow();
      await expect(rateLimitedStore.upsert(memory6, namespace)).resolves.not.toThrow();
    });
  });

  describe('Per-Operation Limits', () => {
    it('should apply different limits for different operations', async () => {
      rateLimitedStore = new RateLimitedMemoryStore(baseStore, {
        strategy: 'fixed-window',
        limits: {
          upsert: { limit: 2, windowSize: 60000 },
          search: { limit: 10, windowSize: 60000 },
          delete: { limit: 1, windowSize: 60000 }
        },
        namespace
      });

      // Test upsert limit
      for (let i = 0; i < 2; i++) {
        const memory = createMemory({ text: `Memory ${i}` });
        await rateLimitedStore.upsert(memory, namespace);
      }

      // 3rd upsert should fail
      const memory3 = createMemory({ text: 'Memory 3' });
      await expect(rateLimitedStore.upsert(memory3, namespace)).rejects.toThrow('Rate limit exceeded');

      // But search should still work
      await expect(rateLimitedStore.searchByText({ text: 'test' }, namespace)).resolves.not.toThrow();
    });

    it('should use default limit for operations without specific limits', async () => {
      rateLimitedStore = new RateLimitedMemoryStore(baseStore, {
        strategy: 'fixed-window',
        limit: 5,
        limits: {
          upsert: { limit: 2, windowSize: 60000 }
        },
        namespace
      });

      // Test upsert with specific limit
      for (let i = 0; i < 2; i++) {
        const memory = createMemory({ text: `Memory ${i}` });
        await rateLimitedStore.upsert(memory, namespace);
      }

      // 3rd upsert should fail
      const memory3 = createMemory({ text: 'Memory 3' });
      await expect(rateLimitedStore.upsert(memory3, namespace)).rejects.toThrow('Rate limit exceeded');

      // Test search with default limit
      for (let i = 0; i < 5; i++) {
        await rateLimitedStore.searchByText({ text: `search ${i}` }, namespace);
      }

      // 6th search should fail
      await expect(rateLimitedStore.searchByText({ text: 'search 6' }, namespace))
        .rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('Quota Management', () => {
    it('should track usage against quotas', async () => {
      rateLimitedStore = new RateLimitedMemoryStore(baseStore, {
        strategy: 'fixed-window',
        limit: 10,
        windowSize: 3600000, // 1 hour
        quotas: {
          daily: { limit: 100, windowSize: 86400000 }, // 100 per day
          monthly: { limit: 2000, windowSize: 2592000000 } // 2000 per month
        },
        namespace
      });

      // Make some requests
      for (let i = 0; i < 15; i++) {
        const memory = createMemory({ text: `Memory ${i}` });
        await rateLimitedStore.upsert(memory, namespace);
      }

      // Check usage stats
      const stats = await rateLimitedStore.getUsageStats(namespace);
      expect(stats.currentWindow.used).toBe(15);
      expect(stats.daily.used).toBe(15);
      expect(stats.monthly.used).toBe(15);
    });

    it('should enforce quota limits', async () => {
      rateLimitedStore = new RateLimitedMemoryStore(baseStore, {
        strategy: 'fixed-window',
        limit: 100, // High per-minute limit
        quotas: {
          daily: { limit: 5, windowSize: 86400000 } // Low daily limit
        },
        namespace
      });

      // Make 5 requests
      for (let i = 0; i < 5; i++) {
        const memory = createMemory({ text: `Memory ${i}` });
        await rateLimitedStore.upsert(memory, namespace);
      }

      // 6th request should be blocked by daily quota
      const memory6 = createMemory({ text: 'Memory 6' });
      await expect(rateLimitedStore.upsert(memory6, namespace)).rejects.toThrow('Daily quota exceeded');
    });
  });

  describe('Usage Tracking', () => {
    it('should track usage per client', async () => {
      rateLimitedStore = new RateLimitedMemoryStore(baseStore, {
        strategy: 'fixed-window',
        limit: 5,
        windowSize: 60000,
        enableClientTracking: true,
        namespace
      });

      // Make requests from different clients
      for (let i = 0; i < 3; i++) {
        const memory = createMemory({ text: `Memory ${i}` });
        await rateLimitedStore.upsert(memory, namespace, { clientId: `client1` });
      }

      for (let i = 0; i < 2; i++) {
        const memory = createMemory({ text: `Memory ${i}` });
        await rateLimitedStore.upsert(memory, namespace, { clientId: `client2` });
      }

      // Check per-client usage
      const stats1 = await rateLimitedStore.getClientUsage('client1', namespace);
      const stats2 = await rateLimitedStore.getClientUsage('client2', namespace);

      expect(stats1.used).toBe(3);
      expect(stats2.used).toBe(2);
    });

    it('should track usage per operation type', async () => {
      rateLimitedStore = new RateLimitedMemoryStore(baseStore, {
        strategy: 'fixed-window',
        limit: 10,
        windowSize: 60000,
        namespace
      });

      // Make different types of requests
      for (let i = 0; i < 3; i++) {
        const memory = createMemory({ text: `Memory ${i}` });
        await rateLimitedStore.upsert(memory, namespace);
      }

      for (let i = 0; i < 2; i++) {
        await rateLimitedStore.searchByText({ text: `search ${i}` }, namespace);
      }

      await rateLimitedStore.delete('memory1', namespace);

      // Check per-operation stats
      const stats = await rateLimitedStore.getUsageStats(namespace);
      expect(stats.operations.upsert).toBe(3);
      expect(stats.operations.search).toBe(2);
      expect(stats.operations.delete).toBe(1);
    });

    it('should track rate limit violations', async () => {
      rateLimitedStore = new RateLimitedMemoryStore(baseStore, {
        strategy: 'fixed-window',
        limit: 2,
        windowSize: 60000,
        namespace
      });

      // Make requests that will be rate limited
      for (let i = 0; i < 5; i++) {
        const memory = createMemory({ text: `Memory ${i}` });
        try {
          await rateLimitedStore.upsert(memory, namespace);
        } catch (error) {
          // Expected to fail
        }
      }

      // Check violation stats
      const stats = await rateLimitedStore.getUsageStats(namespace);
      expect(stats.violations).toBe(3);
    });
  });

  describe('Limit Reset and Cleanup', () => {
    it('should reset limits after window expires', async () => {
      rateLimitedStore = new RateLimitedMemoryStore(baseStore, {
        strategy: 'fixed-window',
        limit: 2,
        windowSize: 5000, // 5 seconds
        namespace
      });

      // Use up limit
      for (let i = 0; i < 2; i++) {
        const memory = createMemory({ text: `Memory ${i}` });
        await rateLimitedStore.upsert(memory, namespace);
      }

      // Should be rate limited
      const memory3 = createMemory({ text: 'Memory 3' });
      await expect(rateLimitedStore.upsert(memory3, namespace)).rejects.toThrow('Rate limit exceeded');

      // Advance time past window
      clock.advanceTimeByTime(6000);

      // Should now work
      const memory4 = createMemory({ text: 'Memory 4' });
      await expect(rateLimitedStore.upsert(memory4, namespace)).resolves.not.toThrow();
    });

    it('should cleanup expired usage data', async () => {
      rateLimitedStore = new RateLimitedMemoryStore(baseStore, {
        strategy: 'fixed-window',
        limit: 5,
        windowSize: 5000,
        enableClientTracking: true,
        namespace
      });

      // Make requests from a client
      for (let i = 0; i < 3; i++) {
        const memory = createMemory({ text: `Memory ${i}` });
        await rateLimitedStore.upsert(memory, namespace, { clientId: 'client1' });
      }

      // Advance time past window and cleanup
      clock.advanceTimeByTime(6000);
      await rateLimitedStore.cleanupExpired();

      // Client usage should be cleaned up
      const stats = await rateLimitedStore.getClientUsage('client1', namespace);
      expect(stats.used).toBe(0);
    });

    it('should persist usage data across restarts', async () => {
      // This test would require a persistent backend
      // For now, we'll test the API exists
      rateLimitedStore = new RateLimitedMemoryStore(baseStore, {
        strategy: 'fixed-window',
        limit: 5,
        windowSize: 60000,
        persistUsage: true,
        namespace
      });

      // Make some requests
      for (let i = 0; i < 3; i++) {
        const memory = createMemory({ text: `Memory ${i}` });
        await rateLimitedStore.upsert(memory, namespace);
      }

      // Check that persistence methods exist
      expect(typeof rateLimitedStore.saveUsageData).toBe('function');
      expect(typeof rateLimitedStore.loadUsageData).toBe('function');
    });
  });

  describe('Advanced Features', () => {
    it('should support dynamic limit adjustment', async () => {
      rateLimitedStore = new RateLimitedMemoryStore(baseStore, {
        strategy: 'fixed-window',
        limit: 5,
        windowSize: 60000,
        namespace
      });

      // Use up current limit
      for (let i = 0; i < 5; i++) {
        const memory = createMemory({ text: `Memory ${i}` });
        await rateLimitedStore.upsert(memory, namespace);
      }

      // Should be rate limited
      const memory6 = createMemory({ text: 'Memory 6' });
      await expect(rateLimitedStore.upsert(memory6, namespace)).rejects.toThrow('Rate limit exceeded');

      // Increase limit
      await rateLimitedStore.updateLimit('upsert', 10);

      // Should now work
      const memory7 = createMemory({ text: 'Memory 7' });
      await expect(rateLimitedStore.upsert(memory7, namespace)).resolves.not.toThrow();
    });

    it('should support burst allowances', async () => {
      rateLimitedStore = new RateLimitedMemoryStore(baseStore, {
        strategy: 'token-bucket',
        limit: 5,
        refillRate: 1,
        burstLimit: 10,
        namespace
      });

      // Should allow burst up to burstLimit
      for (let i = 0; i < 10; i++) {
        const memory = createMemory({ text: `Memory ${i}` });
        await rateLimitedStore.upsert(memory, namespace);
      }

      // 11th request should be rate limited
      const memory11 = createMemory({ text: 'Memory 11' });
      await expect(rateLimitedStore.upsert(memory11, namespace)).rejects.toThrow('Rate limit exceeded');
    });

    it('should support gradual backoff on repeated violations', async () => {
      rateLimitedStore = new RateLimitedMemoryStore(baseStore, {
        strategy: 'fixed-window',
        limit: 2,
        windowSize: 5000,
        enableBackoff: true,
        backoffMultiplier: 2,
        maxBackoffTime: 30000,
        namespace
      });

      // Trigger rate limiting multiple times
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          for (let i = 0; i < 5; i++) {
            const memory = createMemory({ text: `Memory ${attempt}-${i}` });
            await rateLimitedStore.upsert(memory, namespace);
          }
        } catch (error) {
          // Expected to fail
        }

        // Wait for backoff
        clock.advanceTimeByTime(5000 * Math.pow(2, attempt));
      }

      // Check if backoff was applied
      const stats = await rateLimitedStore.getUsageStats(namespace);
      expect(stats.backoffTime).toBeGreaterThan(0);
    });

    it('should support whitelisting and blacklisting', async () => {
      rateLimitedStore = new RateLimitedMemoryStore(baseStore, {
        strategy: 'fixed-window',
        limit: 2,
        windowSize: 60000,
        namespace
      });

      // Whitelist a client
      await rateLimitedStore.addToWhitelist('trusted-client');

      // Blacklist a client
      await rateLimitedStore.addToBlacklist('malicious-client');

      // Whitelisted client should bypass rate limit
      for (let i = 0; i < 5; i++) {
        const memory = createMemory({ text: `Trusted ${i}` });
        await expect(rateLimitedStore.upsert(memory, namespace, {
          clientId: 'trusted-client'
        })).resolves.not.toThrow();
      }

      // Blacklisted client should be blocked entirely
      const badMemory = createMemory({ text: 'Malicious' });
      await expect(rateLimitedStore.upsert(badMemory, namespace, {
        clientId: 'malicious-client'
      })).rejects.toThrow('Client blacklisted');
    });

    it('should provide rate limit headers and info', async () => {
      rateLimitedStore = new RateLimitedMemoryStore(baseStore, {
        strategy: 'fixed-window',
        limit: 5,
        windowSize: 60000,
        namespace
      });

      // Make some requests
      for (let i = 0; i < 3; i++) {
        const memory = createMemory({ text: `Memory ${i}` });
        await rateLimitedStore.upsert(memory, namespace);
      }

      // Get rate limit info
      const rateLimitInfo = await rateLimitedStore.getRateLimitInfo('upsert', namespace);

      expect(rateLimitInfo.limit).toBe(5);
      expect(rateLimitInfo.remaining).toBe(2);
      expect(rateLimitInfo.resetTime).toBeDefined();
      expect(rateLimitInfo.retryAfter).toBeNull();
    });
  });
});