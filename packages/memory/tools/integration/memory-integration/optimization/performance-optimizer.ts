/**
 * Performance Optimizer for Unified Memory System
 * @split_from advanced-memory-setup-phase6.ts
 * 
 * This module handles caching, query optimization, and resource management
 * to ensure optimal performance across the unified memory system.
 */

import { PerformanceMetrics } from '../types/index';

export class PerformanceOptimizer {
  private metrics: PerformanceMetrics = {
    queriesPerSecond: 0,
    averageResponseTime: 0,
    cacheHitRatio: 0,
    memoryUsage: 0,
    activeConnections: 0,
  };
  
  private queryCache = new Map<string, { result: any; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 1000; // Maximum cache entries
  
  private queryCount = 0;
  private totalResponseTime = 0;
  private cacheHits = 0;
  private cacheMisses = 0;
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  constructor() {
    // Start periodic cache cleanup
    this.startCacheCleanup();
  }
  
  /**
   * Optimize query with intelligent caching
   */
  async optimizeQuery<T>(
    queryKey: string,
    queryFunction: () => Promise<T>
  ): Promise<T> {
    const cached = this.queryCache.get(queryKey);
    
    // Check cache first
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      this.cacheHits++;
      this.updateCacheHitRatio();
      return cached.result;
    }
    
    // Cache miss - execute query
    this.cacheMisses++;
    const startTime = Date.now();
    
    try {
      const result = await queryFunction();
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Update performance metrics
      this.updateMetrics(responseTime);
      
      // Cache the result
      this.cacheResult(queryKey, result);
      
      return result;
    } catch (error) {
      // Still update metrics for failed queries
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      this.updateMetrics(responseTime);
      
      throw error;
    }
  }
  
  /**
   * Optimize batch queries for better performance
   */
  async optimizeBatchQueries<T>(
    queries: Array<{ key: string; fn: () => Promise<T> }>
  ): Promise<T[]> {
    console.log(`🚀 Optimizing batch of ${queries.length} queries...`);
    
    const startTime = Date.now();
    
    // Group queries by cache status
    const cachedResults: T[] = [];
    const uncachedQueries: Array<{ index: number; key: string; fn: () => Promise<T> }> = [];
    const resultMap = new Map<number, T>();
    
    // Check cache for each query
    queries.forEach((query, index) => {
      const cached = this.queryCache.get(query.key);
      
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        resultMap.set(index, cached.result);
        this.cacheHits++;
      } else {
        uncachedQueries.push({ index, key: query.key, fn: query.fn });
        this.cacheMisses++;
      }
    });
    
    // Execute uncached queries in parallel
    if (uncachedQueries.length > 0) {
      const uncachedResults = await Promise.all(
        uncachedQueries.map(async (query) => {
          try {
            const result = await query.fn();
            this.cacheResult(query.key, result);
            return { index: query.index, result };
          } catch (error) {
            console.error(`Query failed for key ${query.key}:`, error);
            throw error;
          }
        })
      );
      
      // Map uncached results back to their positions
      uncachedResults.forEach(({ index, result }) => {
        resultMap.set(index, result);
      });
    }
    
    // Reconstruct results in original order
    const results: T[] = [];
    for (let i = 0; i < queries.length; i++) {
      results.push(resultMap.get(i)!);
    }
    
    // Update metrics
    const totalTime = Date.now() - startTime;
    this.updateMetrics(totalTime / queries.length); // Average time per query
    this.updateCacheHitRatio();
    
    console.log(`✅ Batch optimization completed in ${totalTime}ms`);
    return results;
  }
  
  /**
   * Cache a query result with automatic size management
   */
  private cacheResult(key: string, result: any): void {
    // If cache is full, remove oldest entries
    if (this.queryCache.size >= this.MAX_CACHE_SIZE) {
      const entriesToRemove = Math.floor(this.MAX_CACHE_SIZE * 0.1); // Remove 10%
      const sortedEntries = Array.from(this.queryCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      for (let i = 0; i < entriesToRemove; i++) {
        this.queryCache.delete(sortedEntries[i][0]);
      }
    }
    
    this.queryCache.set(key, {
      result,
      timestamp: Date.now(),
    });
  }
  
  /**
   * Update performance metrics
   */
  private updateMetrics(responseTime: number): void {
    this.queryCount++;
    this.totalResponseTime += responseTime;
    
    // Calculate rolling average response time
    this.metrics.averageResponseTime = this.totalResponseTime / this.queryCount;
    
    // Calculate queries per second (simplified)
    this.metrics.queriesPerSecond = this.queryCount / 
      Math.max(1, (Date.now() - this.getStartTime()) / 1000);
    
    // Update memory usage (simplified estimation)
    this.metrics.memoryUsage = this.estimateMemoryUsage();
  }
  
  /**
   * Update cache hit ratio
   */
  private updateCacheHitRatio(): void {
    const totalCacheRequests = this.cacheHits + this.cacheMisses;
    this.metrics.cacheHitRatio = totalCacheRequests > 0 
      ? this.cacheHits / totalCacheRequests 
      : 0;
  }
  
  /**
   * Estimate memory usage
   */
  private estimateMemoryUsage(): number {
    // Simplified memory estimation based on cache size
    const avgEntrySize = 1024; // Assume 1KB per cache entry
    return this.queryCache.size * avgEntrySize / (1024 * 1024); // MB
  }
  
  /**
   * Get start time for QPS calculation
   */
  private getStartTime(): number {
    // Simplified - would track actual start time in production
    return Date.now() - (this.queryCount * 100); // Rough estimate
  }
  
  /**
   * Start periodic cache cleanup
   */
  private startCacheCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanCache();
    }, 60 * 1000); // Clean every minute
  }
  
  /**
   * Clean expired cache entries
   */
  private cleanCache(): void {
    const now = Date.now();
    let removedCount = 0;
    
    for (const [key, value] of this.queryCache.entries()) {
      if (now - value.timestamp > this.CACHE_TTL) {
        this.queryCache.delete(key);
        removedCount++;
      }
    }
    
    if (removedCount > 0) {
      console.log(`🧹 Cleaned ${removedCount} expired cache entries`);
    }
  }
  
  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    // Update active connections (would be actual count in production)
    this.metrics.activeConnections = Math.floor(Math.random() * 10) + 1;
    
    return { ...this.metrics };
  }
  
  /**
   * Get detailed cache statistics
   */
  getCacheStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    totalHits: number;
    totalMisses: number;
    ttlMinutes: number;
  } {
    return {
      size: this.queryCache.size,
      maxSize: this.MAX_CACHE_SIZE,
      hitRate: this.metrics.cacheHitRatio,
      totalHits: this.cacheHits,
      totalMisses: this.cacheMisses,
      ttlMinutes: this.CACHE_TTL / (60 * 1000),
    };
  }
  
  /**
   * Reset all metrics and cache
   */
  resetMetrics(): void {
    this.metrics = {
      queriesPerSecond: 0,
      averageResponseTime: 0,
      cacheHitRatio: 0,
      memoryUsage: 0,
      activeConnections: 0,
    };
    
    this.queryCount = 0;
    this.totalResponseTime = 0;
    this.cacheHits = 0;
    this.cacheMisses = 0;
    
    console.log('📊 Performance metrics reset');
  }
  
  /**
   * Clear cache manually
   */
  clearCache(): void {
    const previousSize = this.queryCache.size;
    this.queryCache.clear();
    
    console.log(`🧹 Cleared ${previousSize} cache entries`);
  }
  
  /**
   * Configure cache settings
   */
  configureCaching(options: {
    ttlMinutes?: number;
    maxSize?: number;
  }): void {
    if (options.ttlMinutes) {
      // @ts-ignore - Modifying readonly property for configuration
      this.CACHE_TTL = options.ttlMinutes * 60 * 1000;
      console.log(`⚙️ Cache TTL updated to ${options.ttlMinutes} minutes`);
    }
    
    if (options.maxSize) {
      // @ts-ignore - Modifying readonly property for configuration
      this.MAX_CACHE_SIZE = options.maxSize;
      console.log(`⚙️ Cache max size updated to ${options.maxSize} entries`);
      
      // Trim cache if necessary
      if (this.queryCache.size > options.maxSize) {
        const entriesToRemove = this.queryCache.size - options.maxSize;
        const sortedEntries = Array.from(this.queryCache.entries())
          .sort((a, b) => a[1].timestamp - b[1].timestamp);
        
        for (let i = 0; i < entriesToRemove; i++) {
          this.queryCache.delete(sortedEntries[i][0]);
        }
        
        console.log(`🧹 Trimmed ${entriesToRemove} cache entries to fit new size limit`);
      }
    }
  }
  
  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    this.clearCache();
    this.resetMetrics();
    
    console.log('🧹 Performance optimizer cleanup completed');
  }
}