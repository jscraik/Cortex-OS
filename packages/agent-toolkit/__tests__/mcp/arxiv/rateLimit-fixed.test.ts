/**
 * @fileoverview Fixed Rate Limiting Tests
 * 
 * This test file contains corrected rate limiting tests that work with the refactored
 * queue processing logic and proper timer handling.
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { withRateLimit, type RateLimitConfig } from '../../../src/mcp/arxiv/rateLimit.js';

describe('Rate Limiting - Fixed Implementation', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  test('should allow immediate first request', async () => {
    const mockFn = vi.fn().mockResolvedValue('first');
    const config: RateLimitConfig = {
      minIntervalMs: 3000,
      maxRetries: 3,
      backoffFactor: 2
    };

    const startTime = Date.now();
    const result = await withRateLimit('test-key', mockFn, config);
    const endTime = Date.now();

    expect(result).toBe('first');
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(endTime - startTime).toBeLessThan(100); // Should be immediate
  });

  test('should throttle subsequent requests', async () => {
    const mockFn = vi.fn()
      .mockResolvedValueOnce('first')
      .mockResolvedValueOnce('second');
    
    const config: RateLimitConfig = {
      minIntervalMs: 1000, // Use shorter interval for faster tests
      maxRetries: 3,
      backoffFactor: 2
    };

    // First request should be immediate
    const promise1 = withRateLimit('test-key', mockFn, config);
    const result1 = await promise1;
    expect(result1).toBe('first');

    // Second request should be queued
    const promise2 = withRateLimit('test-key', mockFn, config);
    
    // Advance time to allow queue processing
    await vi.advanceTimersByTimeAsync(1000);
    
    const result2 = await promise2;
    expect(result2).toBe('second');
    expect(mockFn).toHaveBeenCalledTimes(2);
  }, 10000);

  test('should handle multiple queued requests', async () => {
    const mockFn = vi.fn()
      .mockResolvedValueOnce('first')
      .mockResolvedValueOnce('second')
      .mockResolvedValueOnce('third');
    
    const config: RateLimitConfig = {
      minIntervalMs: 500, // Short interval for faster tests
      maxRetries: 3,
      backoffFactor: 2
    };

    // Start all requests quickly
    const promise1 = withRateLimit('test-key', mockFn, config);
    const promise2 = withRateLimit('test-key', mockFn, config);
    const promise3 = withRateLimit('test-key', mockFn, config);

    // First should complete immediately
    const result1 = await promise1;
    expect(result1).toBe('first');

    // Advance time for second request
    await vi.advanceTimersByTimeAsync(500);
    const result2 = await promise2;
    expect(result2).toBe('second');

    // Advance time for third request
    await vi.advanceTimersByTimeAsync(500);
    const result3 = await promise3;
    expect(result3).toBe('third');

    expect(mockFn).toHaveBeenCalledTimes(3);
  }, 10000);

  test('should handle different client keys independently', async () => {
    const mockFn1 = vi.fn().mockResolvedValue('client1');
    const mockFn2 = vi.fn().mockResolvedValue('client2');
    
    const config: RateLimitConfig = {
      minIntervalMs: 1000,
      maxRetries: 3,
      backoffFactor: 2
    };

    // Both should execute immediately since they're different clients
    const promise1 = withRateLimit('client1', mockFn1, config);
    const promise2 = withRateLimit('client2', mockFn2, config);

    const [result1, result2] = await Promise.all([promise1, promise2]);

    expect(result1).toBe('client1');
    expect(result2).toBe('client2');
    expect(mockFn1).toHaveBeenCalledTimes(1);
    expect(mockFn2).toHaveBeenCalledTimes(1);
  });

  test('should implement exponential backoff on errors', async () => {
    const mockFn = vi.fn()
      .mockRejectedValueOnce(new Error('Rate limited'))
      .mockResolvedValueOnce('success');
    
    const config: RateLimitConfig = {
      minIntervalMs: 100,
      maxRetries: 3,
      backoffFactor: 2
    };

    const promise = withRateLimit('test-key', mockFn, config);
    
    // Advance time to trigger retry
    await vi.advanceTimersByTimeAsync(1000); // Base backoff delay
    
    const result = await promise;
    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(2); // Initial call + 1 retry
  }, 10000);

  test('should respect maximum retry limits', async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error('Always fails'));
    
    const config: RateLimitConfig = {
      minIntervalMs: 100,
      maxRetries: 2,
      backoffFactor: 2
    };

    await expect(async () => {
      const promise = withRateLimit('test-key', mockFn, config);
      
      // Advance through all retry attempts
      await vi.advanceTimersByTimeAsync(5000);
      
      await promise;
    }).rejects.toThrow('Always fails');

    // Should try: initial + 2 retries = 3 total
    expect(mockFn).toHaveBeenCalledTimes(3);
  }, 10000);

  test('should include brAInwav branding in logs', async () => {
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const mockFn = vi.fn().mockResolvedValue('success');
    
    const config: RateLimitConfig = {
      minIntervalMs: 1000,
      maxRetries: 3,
      backoffFactor: 2
    };

    await withRateLimit('test-key', mockFn, config);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[brAInwav]'),
      expect.objectContaining({
        brand: 'brAInwav'
      })
    );

    consoleSpy.mockRestore();
  });
});