/**
 * Performance Optimization Tests
 * Phase 7: Validate caching, monitoring, and batch operations
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OptimizedMemorySystem } from '../optimized-memory-system';
import { BatchProcessor, MemoryCache, PerformanceMonitor } from '../performance-optimizer';

describe('Performance Optimizer', () => {
  describe('MemoryCache', () => {
    let cache: MemoryCache<string>;

    beforeEach(() => {
      cache = new MemoryCache<string>(3, 1000); // Small cache with 1s TTL for testing
    });

    it('should store and retrieve values', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should return null for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeNull();
    });

    it('should respect TTL and expire entries', async () => {
      cache.set('key1', 'value1', 50); // 50ms TTL
      expect(cache.get('key1')).toBe('value1');

      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(cache.get('key1')).toBeNull();
    });

    it('should evict LRU entries when at capacity', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      cache.set('key4', 'value4'); // Should evict key1

      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBe('value2');
      expect(cache.get('key3')).toBe('value3');
      expect(cache.get('key4')).toBe('value4');
    });

    it('should update LRU order on access', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      // Access key1 to make it most recently used
      cache.get('key1');

      cache.set('key4', 'value4'); // Should evict key2 instead of key1

      expect(cache.get('key1')).toBe('value1');
      expect(cache.get('key2')).toBeNull();
      expect(cache.get('key3')).toBe('value3');
      expect(cache.get('key4')).toBe('value4');
    });
  });

  describe('PerformanceMonitor', () => {
    let monitor: PerformanceMonitor;

    beforeEach(() => {
      monitor = new PerformanceMonitor();
    });

    it('should record operation metrics', () => {
      monitor.recordOperation('test_op', 100, true, false);

      const stats = monitor.getStats('test_op');
      expect(stats.count).toBe(1);
      expect(stats.avgDuration).toBe(100);
      expect(stats.successRate).toBe(1);
      expect(stats.cacheHitRate).toBe(0);
    });

    it('should calculate correct statistics', () => {
      monitor.recordOperation('test_op', 100, true, false);
      monitor.recordOperation('test_op', 200, true, true);
      monitor.recordOperation('test_op', 300, false, false);

      const stats = monitor.getStats('test_op');
      expect(stats.count).toBe(3);
      expect(stats.avgDuration).toBe(200);
      expect(stats.successRate).toBeCloseTo(0.67, 2);
      expect(stats.cacheHitRate).toBeCloseTo(0.33, 2);
    });

    it('should emit metric events', () => {
      const mockListener = vi.fn();
      monitor.on('metric', mockListener);

      monitor.recordOperation('test_op', 100, true, false);

      expect(mockListener).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'test_op',
          duration: 100,
          success: true,
          cacheHit: false,
        }),
      );
    });
  });

  describe('BatchProcessor', () => {
    it('should process items in batches', async () => {
      const batchProcessor = vi.fn().mockResolvedValue(['result1', 'result2']);
      const processor = new BatchProcessor(batchProcessor, 2, 50);

      const promise1 = processor.add('item1');
      const promise2 = processor.add('item2');

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1).toBe('result1');
      expect(result2).toBe('result2');
      expect(batchProcessor).toHaveBeenCalledWith(['item1', 'item2']);
    });

    it('should handle batch processing errors', async () => {
      const batchProcessor = vi.fn().mockRejectedValue(new Error('Batch error'));
      const processor = new BatchProcessor(batchProcessor, 2, 50);

      const promise1 = processor.add('item1');
      const promise2 = processor.add('item2');

      await expect(promise1).rejects.toThrow('Batch error');
      await expect(promise2).rejects.toThrow('Batch error');
    });
  });

  describe('OptimizedMemorySystem', () => {
    let system: OptimizedMemorySystem;

    beforeEach(() => {
      system = new OptimizedMemorySystem();
    });

    it('should create system without errors', () => {
      expect(system).toBeInstanceOf(OptimizedMemorySystem);
    });

    it('should return performance stats', () => {
      const stats = system.getPerformanceStats();

      expect(stats).toHaveProperty('overall');
      expect(stats).toHaveProperty('search');
      expect(stats).toHaveProperty('batch');
      expect(stats).toHaveProperty('cache');
      expect(stats.cache).toHaveProperty('size');
      expect(stats.cache).toHaveProperty('hitRate');
    });

    it('should shutdown gracefully', async () => {
      await expect(system.shutdown()).resolves.not.toThrow();
    });
  });
});
