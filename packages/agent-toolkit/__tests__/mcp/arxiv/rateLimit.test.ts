/**
 * @fileoverview Phase B.1 RED Tests - Rate Limiting Implementation
 * 
 * These tests are written to FAIL initially (RED phase of TDD).
 * They define expected behavior for arXiv API rate limiting compliance.
 * 
 * Task: arxiv-mcp-tool-integration
 * Phase: B.1 - Basic Rate Limiting (RED)
 * Policy: Following agentic-phase-policy.md R→G→F→REVIEW
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

// Import will fail initially - this is expected for RED phase
import { withRateLimit, type RateLimitConfig } from '../../../src/mcp/arxiv/rateLimit.js';

describe('Rate Limiting', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('should allow immediate first request', async () => {
    const mockFn = vi.fn().mockResolvedValue('success');
    const config: RateLimitConfig = {
      minIntervalMs: 3000,
      maxRetries: 3,
      backoffFactor: 2
    };

    const startTime = Date.now();
    const result = await withRateLimit('test-key', mockFn, config);

    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(Date.now() - startTime).toBeLessThan(100); // Should be immediate
  });

  test('should throttle subsequent requests to 3 second intervals', async () => {
    const mockFn = vi.fn()
      .mockResolvedValueOnce('first')
      .mockResolvedValueOnce('second');
    
    const config: RateLimitConfig = {
      minIntervalMs: 3000,
      maxRetries: 3,
      backoffFactor: 2
    };

    // First request
    const result1 = await withRateLimit('test-key', mockFn, config);
    expect(result1).toBe('first');

    // Second request should be delayed
    const promise2 = withRateLimit('test-key', mockFn, config);
    
    // Fast-forward to just before 3 seconds
    vi.advanceTimersByTime(2999);
    expect(mockFn).toHaveBeenCalledTimes(1); // Still only first call

    // Fast-forward past 3 seconds
    vi.advanceTimersByTime(1);
    await vi.runAllTimersAsync();
    
    const result2 = await promise2;
    expect(result2).toBe('second');
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  test('should queue multiple requests properly', async () => {
    const mockFn = vi.fn()
      .mockResolvedValueOnce('first')
      .mockResolvedValueOnce('second')
      .mockResolvedValueOnce('third');
    
    const config: RateLimitConfig = {
      minIntervalMs: 3000,
      maxRetries: 3,
      backoffFactor: 2
    };

    // Start three requests simultaneously
    const promise1 = withRateLimit('test-key', mockFn, config);
    const promise2 = withRateLimit('test-key', mockFn, config);
    const promise3 = withRateLimit('test-key', mockFn, config);

    // First should execute immediately
    const result1 = await promise1;
    expect(result1).toBe('first');
    expect(mockFn).toHaveBeenCalledTimes(1);

    // Advance to trigger second request
    vi.advanceTimersByTime(3000);
    await vi.runAllTimersAsync();
    
    const result2 = await promise2;
    expect(result2).toBe('second');
    expect(mockFn).toHaveBeenCalledTimes(2);

    // Advance to trigger third request
    vi.advanceTimersByTime(3000);
    await vi.runAllTimersAsync();
    
    const result3 = await promise3;
    expect(result3).toBe('third');
    expect(mockFn).toHaveBeenCalledTimes(3);
  });

  test('should handle concurrent requests from same client', async () => {
    const mockFn = vi.fn().mockResolvedValue('success');
    const config: RateLimitConfig = {
      minIntervalMs: 3000,
      maxRetries: 3,
      backoffFactor: 2
    };

    // Multiple simultaneous requests
    const promises = Array.from({ length: 5 }, () => 
      withRateLimit('same-client', mockFn, config)
    );

    // Fast-forward through all intervals
    for (let i = 0; i < 5; i++) {
      vi.advanceTimersByTime(3000);
      await vi.runAllTimersAsync();
    }

    const results = await Promise.all(promises);
    
    expect(results).toHaveLength(5);
    expect(mockFn).toHaveBeenCalledTimes(5);
    expect(results.every(r => r === 'success')).toBe(true);
  });

  test('should implement exponential backoff on errors', async () => {
    const mockFn = vi.fn()
      .mockRejectedValueOnce(new Error('Rate limited'))
      .mockRejectedValueOnce(new Error('Still rate limited'))
      .mockResolvedValueOnce('success');
    
    const config: RateLimitConfig = {
      minIntervalMs: 3000,
      maxRetries: 3,
      backoffFactor: 2
    };

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const promise = withRateLimit('test-key', mockFn, config);

    // First attempt fails immediately
    vi.advanceTimersByTime(0);
    await vi.runAllTimersAsync();

    // First retry after 1 second (base backoff)
    vi.advanceTimersByTime(1000);
    await vi.runAllTimersAsync();

    // Second retry after 2 seconds (exponential backoff)
    vi.advanceTimersByTime(2000);
    await vi.runAllTimersAsync();

    const result = await promise;
    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(3);
    
    // Should have logged backoff attempts with brAInwav branding
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[brAInwav]')
    );
    
    consoleSpy.mockRestore();
  });

  test('should include brAInwav correlation IDs in logs', async () => {
    const mockFn = vi.fn().mockResolvedValue('success');
    const config: RateLimitConfig = {
      minIntervalMs: 3000,
      maxRetries: 3,
      backoffFactor: 2
    };

    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    await withRateLimit('test-key', mockFn, config);

    // Should log with correlation ID and brAInwav branding
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[brAInwav]'),
      expect.objectContaining({
        correlationId: expect.stringMatching(/^cortex_\d+_[a-f0-9]{8}$/),
        brand: 'brAInwav'
      })
    );
    
    consoleSpy.mockRestore();
  });

  test('should respect maximum retry limits', async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error('Always fails'));
    const config: RateLimitConfig = {
      minIntervalMs: 3000,
      maxRetries: 2, // Only 2 retries allowed
      backoffFactor: 2
    };

    const promise = withRateLimit('test-key', mockFn, config);

    // Initial attempt + 2 retries = 3 total attempts
    for (let i = 0; i < 3; i++) {
      vi.advanceTimersByTime(Math.pow(2, i) * 1000);
      await vi.runAllTimersAsync();
    }

    await expect(promise).rejects.toThrow('Always fails');
    expect(mockFn).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });

  test('should handle rate limiter timeout scenarios', async () => {
    const mockFn = vi.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 5000)) // 5 second delay
    );
    
    const config: RateLimitConfig = {
      minIntervalMs: 3000,
      maxRetries: 3,
      backoffFactor: 2
    };

    const promise = withRateLimit('test-key', mockFn, config);

    // Should timeout and clean up properly
    vi.advanceTimersByTime(10000); // Advance past any reasonable timeout
    
    // The promise should either resolve or reject, not hang
    await expect(Promise.race([
      promise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Test timeout')), 1000)
      )
    ])).rejects.toThrow('Test timeout');
  });
});