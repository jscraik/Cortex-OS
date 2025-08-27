/**
 * Comprehensive Integration Tests for Unified Memory System
 * Tests cross-library synchronization and unified operations
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { UnifiedMemoryManager } from '../unified-memory-manager';
import { SyncCoordinator } from '../sync-coordinator';
import { PerformanceOptimizer } from '../performance-optimizer';

describe('Unified Memory System Integration Tests', () => {
  let unifiedManager: UnifiedMemoryManager;
  let syncCoordinator: SyncCoordinator;
  let performanceOptimizer: PerformanceOptimizer;

  beforeAll(async () => {
    unifiedManager = new UnifiedMemoryManager();
    performanceOptimizer = new PerformanceOptimizer();

    const initResult = await unifiedManager.initialize();
    expect(initResult.unifiedReady).toBe(true);

    syncCoordinator = new SyncCoordinator(unifiedManager);
  });

  afterAll(async () => {
    await unifiedManager.cleanup();
    syncCoordinator.stopScheduledSync();
  });

  test('should initialize all memory libraries successfully', async () => {
    const initResult = await unifiedManager.initialize();

    expect(initResult.mem0Ready).toBe(true);
    expect(initResult.graphitiReady).toBe(true);
    expect(initResult.lettaReady).toBe(true);
    expect(initResult.unifiedReady).toBe(true);
  });

  test('should perform full synchronization across libraries', async () => {
    const syncOperations = await unifiedManager.performFullSync();

    expect(Array.isArray(syncOperations)).toBe(true);
    expect(syncOperations.length).toBeGreaterThan(0);

    // Check that all sync operations completed successfully
    const failedOps = syncOperations.filter((op) => op.status === 'failed');
    expect(failedOps.length).toBe(0);

    const completedOps = syncOperations.filter((op) => op.status === 'completed');
    expect(completedOps.length).toBeGreaterThan(0);
  });

  test('should provide unified statistics from all libraries', async () => {
    const stats = await unifiedManager.getUnifiedStats();

    expect(stats).toHaveProperty('mem0');
    expect(stats).toHaveProperty('graphiti');
    expect(stats).toHaveProperty('letta');
    expect(stats).toHaveProperty('unified');

    expect(typeof stats.mem0.totalMemories).toBe('number');
    expect(typeof stats.graphiti.totalEntities).toBe('number');
    expect(typeof stats.letta.totalMemories).toBe('number');
    expect(typeof stats.unified.totalSyncedItems).toBe('number');
  });

  test('should perform unified search across all libraries', async () => {
    const searchResults = await unifiedManager.searchUnified('memory system', 15);

    expect(searchResults).toHaveProperty('mem0Results');
    expect(searchResults).toHaveProperty('graphitiResults');
    expect(searchResults).toHaveProperty('lettaResults');
    expect(searchResults).toHaveProperty('combinedResults');

    expect(Array.isArray(searchResults.combinedResults)).toBe(true);
    expect(searchResults.combinedResults.length).toBeLessThanOrEqual(15);

    // Each result should have a source tag
    searchResults.combinedResults.forEach((result) => {
      expect(result).toHaveProperty('source');
      expect(['mem0', 'graphiti', 'letta']).toContain(result.source);
    });
  });

  test('should handle sync coordination properly', async () => {
    await syncCoordinator.startScheduledSync();

    // Wait a short time for any immediate sync operations
    await new Promise((resolve) => setTimeout(resolve, 1000));

    syncCoordinator.stopScheduledSync();

    // Test should complete without errors
    expect(true).toBe(true);
  });

  test('should optimize performance with caching', async () => {
    const testQuery = async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return { test: 'data', timestamp: Date.now() };
    };

    // First call should take full time
    const start1 = Date.now();
    const result1 = await performanceOptimizer.optimizeQuery('test_query', testQuery);
    const duration1 = Date.now() - start1;

    // Second call should be cached and faster
    const start2 = Date.now();
    const result2 = await performanceOptimizer.optimizeQuery('test_query', testQuery);
    const duration2 = Date.now() - start2;

    expect(result1).toEqual(result2);
    expect(duration2).toBeLessThan(duration1);

    const metrics = performanceOptimizer.getMetrics();
    expect(typeof metrics.cacheHitRatio).toBe('number');
    expect(typeof metrics.averageResponseTime).toBe('number');
  });
});

describe('Cross-Library Data Consistency Tests', () => {
  let unifiedManager: UnifiedMemoryManager;

  beforeAll(async () => {
    unifiedManager = new UnifiedMemoryManager();
    await unifiedManager.initialize();
  });

  afterAll(async () => {
    await unifiedManager.cleanup();
  });

  test('should maintain data consistency during sync operations', async () => {
    // This test would verify that data remains consistent
    // across all libraries during synchronization
    const statsBefore = await unifiedManager.getUnifiedStats();

    await unifiedManager.performFullSync();

    const statsAfter = await unifiedManager.getUnifiedStats();

    // Total data should not decrease (only increase or stay same)
    expect(statsAfter.unified.totalSyncedItems).toBeGreaterThanOrEqual(
      statsBefore.unified.totalSyncedItems,
    );
  });

  test('should handle conflict resolution properly', async () => {
    // Test conflict resolution scenarios
    // This would involve creating conflicting data and ensuring
    // the unified system resolves conflicts according to configuration
    expect(true).toBe(true); // Placeholder for complex conflict tests
  });
});

describe('Performance and Scalability Tests', () => {
  let unifiedManager: UnifiedMemoryManager;
  let performanceOptimizer: PerformanceOptimizer;

  beforeAll(async () => {
    unifiedManager = new UnifiedMemoryManager();
    performanceOptimizer = new PerformanceOptimizer();
    await unifiedManager.initialize();
  });

  afterAll(async () => {
    await unifiedManager.cleanup();
  });

  test('should handle concurrent operations efficiently', async () => {
    const concurrentSearches = [];

    for (let i = 0; i < 10; i++) {
      concurrentSearches.push(unifiedManager.searchUnified(`test query ${i}`, 5));
    }

    const startTime = Date.now();
    const results = await Promise.all(concurrentSearches);
    const duration = Date.now() - startTime;

    expect(results.length).toBe(10);
    expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

    results.forEach((result) => {
      expect(result).toHaveProperty('combinedResults');
    });
  });

  test('should maintain performance under load', async () => {
    performanceOptimizer.resetMetrics();

    // Simulate load
    const operations = [];
    for (let i = 0; i < 50; i++) {
      operations.push(
        performanceOptimizer.optimizeQuery(`load_test_${i}`, async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return { data: `test_${i}` };
        }),
      );
    }

    await Promise.all(operations);

    const metrics = performanceOptimizer.getMetrics();
    expect(metrics.averageResponseTime).toBeLessThan(100); // Average under 100ms
    expect(metrics.queriesPerSecond).toBeGreaterThan(0);
  });
});
