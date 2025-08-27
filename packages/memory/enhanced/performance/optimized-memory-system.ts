/**
 * Performance-Optimized Memory Bridge Integration
 * Applies caching, connection pooling, and monitoring to memory bridges
 */

// import { CortexGraphitiBridge } from '../graphiti/bridge/cortex-graphiti-bridge';
import { CortexMem0Bridge } from '../../bridge/cortex-mem0-bridge';
import { MemoryCache, PerformanceMonitor } from './performance-optimizer';

/**
 * Enhanced Memory System with Performance Optimizations
 */
export class OptimizedMemorySystem {
  private cache = new MemoryCache<unknown>();
  private performanceMonitor = new PerformanceMonitor();
  private mem0Bridge: CortexMem0Bridge;
  private graphitiBridge: CortexGraphitiBridge;

  constructor() {
    // Initialize bridges
    this.mem0Bridge = new CortexMem0Bridge();
    // this.graphitiBridge = new CortexGraphitiBridge();
  }

  /**
   * Cached memory search across all bridges
   */
  async searchMemories(
    query: string,
    userId?: string,
  ): Promise<{
    mem0: unknown[];
    graphiti: unknown[];
  }> {
    const cacheKey = `search_${query}_${userId || 'global'}`;
    const cached = this.cache.get(cacheKey);

    if (cached) {
      return cached as {
        mem0: unknown[];
        graphiti: unknown[];
      };
    }

    const startTime = Date.now();

    try {
      // Parallel search across bridges
      const [mem0Results, graphitiResults] = await Promise.allSettled([
        this.mem0Bridge.searchMemories(query, userId),
        // this.graphitiBridge.searchEntities(query, 'entity'),
      ]);

      const result = {
        mem0: mem0Results.status === 'fulfilled' ? mem0Results.value : [],
        graphiti: graphitiResults.status === 'fulfilled' ? graphitiResults.value : [],
      };

      // Cache for 5 minutes
      this.cache.set(cacheKey, result, 300000);

      this.performanceMonitor.recordOperation(
        'searchMemories',
        Date.now() - startTime,
        true,
        false,
      );
      return result;
    } catch (error) {
      this.performanceMonitor.recordOperation(
        'searchMemories',
        Date.now() - startTime,
        false,
        false,
      );
      throw error;
    }
  }

  /**
   * Batch memory operations for improved performance
   */
  async addMemoriesBatch(
    memories: Array<{
      content: string;
      userId?: string;
      metadata?: Record<string, unknown>;
    }>,
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Process in batches to avoid overwhelming the system
      const batchSize = 10;
      const batches = [];

      for (let i = 0; i < memories.length; i += batchSize) {
        batches.push(memories.slice(i, i + batchSize));
      }

      for (const batch of batches) {
        await Promise.allSettled(
          batch.map(async (memory) => {
            // Add to mem0 bridge (primary storage)
            await this.mem0Bridge.addMemory(memory.content, memory.userId);
          }),
        );
      }

      // Clear relevant cache entries
      this.clearSearchCache();

      this.performanceMonitor.recordOperation(
        'addMemoriesBatch',
        Date.now() - startTime,
        true,
        false,
      );
    } catch (error) {
      this.performanceMonitor.recordOperation(
        'addMemoriesBatch',
        Date.now() - startTime,
        false,
        false,
      );
      throw error;
    }
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(timeWindow?: number) {
    return {
      overall: this.performanceMonitor.getStats(undefined, timeWindow),
      search: this.performanceMonitor.getStats('searchMemories', timeWindow),
      batch: this.performanceMonitor.getStats('addMemoriesBatch', timeWindow),
      cache: {
        size: this.cache.size(),
        hitRate: this.performanceMonitor.getStats(undefined, timeWindow).cacheHitRate,
      },
    };
  }

  /**
   * Clear search-related cache entries
   */
  private clearSearchCache(): void {
    // In a real implementation, we'd track cache keys by pattern
    this.cache.clear(); // Simple approach for now
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    // In a real implementation, close connections, flush caches, etc.
    this.cache.clear();
  }
}

/**
 * Factory function to create optimized memory system
 */
export function createOptimizedMemorySystem(): OptimizedMemorySystem {
  return new OptimizedMemorySystem();
}

export default OptimizedMemorySystem;
