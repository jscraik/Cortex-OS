/**
 * Tests for utility functions
 */

import { describe, it, expect, vi } from 'vitest';
import {
  generateAgentId,
  generateTraceId,
  sleep,
  timeout,
  withTimeout,
  retry,
  debounce,
  throttle,
  deepClone,
  isDefined,
  filterDefined,
  safeGet,
  estimateTokens,
  truncateToTokens,
} from '@/lib/utils.js';

describe('Utility Functions', () => {
  describe('ID generation', () => {
    it('should generate agent ID in UUID format', () => {
      const id = generateAgentId();
      expect(id).toBeUUID();
    });

    it('should generate unique agent IDs', () => {
      const id1 = generateAgentId();
      const id2 = generateAgentId();
      expect(id1).not.toBe(id2);
    });

    it('should generate trace ID in UUID format', () => {
      const id = generateTraceId();
      expect(id).toBeUUID();
    });
  });

  describe('async utilities', () => {
    it('should sleep for specified duration', async () => {
      const start = Date.now();
      await sleep(100);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(90); // Allow some tolerance
    });

    it('should timeout after specified duration', async () => {
      const promise = timeout(50, 'Custom timeout message');
      await expect(promise).rejects.toThrow('Custom timeout message');
    });

    it('should resolve with promise result before timeout', async () => {
      const fastPromise = Promise.resolve('success');
      const result = await withTimeout(fastPromise, 1000);
      expect(result).toBe('success');
    });

    it('should reject on timeout', async () => {
      const slowPromise = new Promise((resolve) => setTimeout(resolve, 200));
      await expect(withTimeout(slowPromise, 50)).rejects.toThrow('Operation timed out');
    });
  });

  describe('retry', () => {
    it('should succeed on first attempt', async () => {
      const successFn = vi.fn().mockResolvedValue('success');
      const result = await retry(successFn);
      expect(result).toBe('success');
      expect(successFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const failThenSucceed = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success');

      const result = await retry(failThenSucceed, 3, 10); // Short delay for test
      expect(result).toBe('success');
      expect(failThenSucceed).toHaveBeenCalledTimes(3);
    });

    it('should throw last error after max attempts', async () => {
      const alwaysFail = vi.fn().mockRejectedValue(new Error('always fails'));

      await expect(retry(alwaysFail, 2, 10)).rejects.toThrow('always fails');
      expect(alwaysFail).toHaveBeenCalledTimes(2);
    });
  });

  describe('debounce', () => {
    it('should debounce function calls', async () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 50);

      debouncedFn('call1');
      debouncedFn('call2');
      debouncedFn('call3');

      expect(fn).not.toHaveBeenCalled();

      await sleep(60);
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith('call3');
    });
  });

  describe('throttle', () => {
    it('should throttle function calls', async () => {
      const fn = vi.fn();
      const throttledFn = throttle(fn, 100);

      throttledFn('call1');
      throttledFn('call2'); // Should be throttled but executed after interval

      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith('call1');

      // Wait for throttled call to execute
      await sleep(150);

      expect(fn).toHaveBeenCalledTimes(2);
      expect(fn).toHaveBeenLastCalledWith('call2');

      // Wait a bit more to ensure throttle period is complete
      await sleep(50);
      throttledFn('call3');

      expect(fn).toHaveBeenCalledTimes(3);
      expect(fn).toHaveBeenLastCalledWith('call3');
    });
  });

  describe('object utilities', () => {
    it('should deep clone objects', () => {
      const original = { a: 1, b: { c: 2, d: [3, 4] } };
      const cloned = deepClone(original);

      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned.b).not.toBe(original.b);
      expect(cloned.b.d).not.toBe(original.b.d);
    });

    it('should check if value is defined', () => {
      expect(isDefined('value')).toBe(true);
      expect(isDefined(0)).toBe(true);
      expect(isDefined(false)).toBe(true);
      expect(isDefined(null)).toBe(false);
      expect(isDefined(undefined)).toBe(false);
    });

    it('should filter out undefined values', () => {
      const array = ['a', undefined, 'b', null, 'c'];
      const filtered = filterDefined(array);
      expect(filtered).toEqual(['a', 'b', 'c']); // null values are also filtered out by isDefined
    });

    it('should safely get nested properties', () => {
      const obj = { a: { b: { c: 'value' } } };

      expect(safeGet(obj, 'a.b.c')).toBe('value');
      expect(safeGet(obj, 'a.b.d', 'default')).toBe('default');
      expect(safeGet(obj, 'x.y.z')).toBeUndefined();
      expect(safeGet(null, 'a.b.c', 'default')).toBe('default');
    });
  });

  describe('token utilities', () => {
    it('should estimate tokens from text', () => {
      expect(estimateTokens('hello world')).toBe(2); // 2 words = 2 base tokens
      expect(estimateTokens('')).toBe(0);
      expect(estimateTokens('a')).toBe(1);
      expect(estimateTokens('hello world', 'mlx')).toBe(1); // MLX efficiency: 2 * 0.85 = 1.7 -> 1
    });

    it('should truncate text to fit token limit', () => {
      const longText = 'This is a very long text that should be truncated';
      const truncated = truncateToTokens(longText, 5);

      const estimatedTokens = estimateTokens(truncated);
      expect(estimatedTokens).toBeLessThanOrEqual(5);
      expect(truncated).toMatch(/\.\.\.$/);
    });

    it('should not truncate text under token limit', () => {
      const shortText = 'Short text';
      const result = truncateToTokens(shortText, 10);
      expect(result).toBe(shortText);
    });
  });
});
