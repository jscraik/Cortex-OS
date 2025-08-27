/**
 * Performance Optimization Layer for Unified Memory System
 * Phase 7: Caching, Connection Pooling, and Batch Operations
 */

import { EventEmitter } from 'events';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface PerformanceMetrics {
  operation: string;
  duration: number;
  timestamp: number;
  success: boolean;
  cacheHit?: boolean;
}

/**
 * Memory Cache with TTL and LRU eviction
 */
export class MemoryCache<T = unknown> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxSize: number;
  private defaultTTL: number;

  constructor(maxSize: number = 1000, defaultTTL: number = 300000) {
    // 5 minutes default TTL
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  set(key: string, data: T, ttl?: number): void {
    // Evict expired entries
    this.cleanup();

    // Evict LRU if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Move to end (LRU)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.data;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    this.cleanup();
    return this.cache.size;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

/**
 * Connection Pool for Database Connections
 */
export class ConnectionPool<T> {
  private pool: T[] = [];
  private active: Set<T> = new Set();
  private createConnection: () => Promise<T>;
  private destroyConnection: (conn: T) => Promise<void>;
  private maxConnections: number;
  private minConnections: number;

  constructor(
    createConnection: () => Promise<T>,
    destroyConnection: (conn: T) => Promise<void>,
    maxConnections: number = 10,
    minConnections: number = 2,
  ) {
    this.createConnection = createConnection;
    this.destroyConnection = destroyConnection;
    this.maxConnections = maxConnections;
    this.minConnections = minConnections;
  }

  async initialize(): Promise<void> {
    // Create minimum connections
    for (let i = 0; i < this.minConnections; i++) {
      const conn = await this.createConnection();
      this.pool.push(conn);
    }
  }

  async acquire(): Promise<T> {
    // Try to get from pool
    let connection = this.pool.pop();

    // Create new if pool empty and under limit
    if (!connection && this.active.size < this.maxConnections) {
      connection = await this.createConnection();
    }

    // Wait for connection if at limit
    if (!connection) {
      // In real implementation, use queue and event waiting
      throw new Error('No connections available');
    }

    this.active.add(connection);
    return connection;
  }

  async release(connection: T): Promise<void> {
    this.active.delete(connection);

    // Return to pool if under max
    if (this.pool.length < this.maxConnections - this.active.size) {
      this.pool.push(connection);
    } else {
      await this.destroyConnection(connection);
    }
  }

  async destroy(): Promise<void> {
    // Destroy all pooled connections
    for (const conn of this.pool) {
      await this.destroyConnection(conn);
    }
    this.pool = [];
    this.active.clear();
  }

  getStats() {
    return {
      pooled: this.pool.length,
      active: this.active.size,
      total: this.pool.length + this.active.size,
    };
  }
}

/**
 * Performance Metrics Collector
 */
export class PerformanceMonitor extends EventEmitter {
  private metrics: PerformanceMetrics[] = [];
  private maxMetrics: number = 10000;

  recordOperation(operation: string, duration: number, success: boolean, cacheHit?: boolean): void {
    const metric: PerformanceMetrics = {
      operation,
      duration,
      timestamp: Date.now(),
      success,
      cacheHit,
    };

    this.metrics.push(metric);

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    this.emit('metric', metric);
  }

  getStats(
    operation?: string,
    timeWindow?: number,
  ): {
    count: number;
    avgDuration: number;
    successRate: number;
    cacheHitRate: number;
    p95Duration: number;
  } {
    const now = Date.now();
    let relevantMetrics = this.metrics;

    // Filter by operation
    if (operation) {
      relevantMetrics = relevantMetrics.filter((m) => m.operation === operation);
    }

    // Filter by time window
    if (timeWindow) {
      relevantMetrics = relevantMetrics.filter((m) => now - m.timestamp <= timeWindow);
    }

    if (relevantMetrics.length === 0) {
      return { count: 0, avgDuration: 0, successRate: 0, cacheHitRate: 0, p95Duration: 0 };
    }

    const durations = relevantMetrics.map((m) => m.duration).sort((a, b) => a - b);
    const successes = relevantMetrics.filter((m) => m.success).length;
    const cacheHits = relevantMetrics.filter((m) => m.cacheHit).length;

    return {
      count: relevantMetrics.length,
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      successRate: successes / relevantMetrics.length,
      cacheHitRate: cacheHits / relevantMetrics.length,
      p95Duration: durations[Math.floor(durations.length * 0.95)] || 0,
    };
  }
}

/**
 * Batch Operation Handler
 */
export class BatchProcessor<T, R> {
  private pending: Array<{
    data: T;
    resolve: (result: R) => void;
    reject: (error: Error) => void;
  }> = [];

  private processor: (batch: T[]) => Promise<R[]>;
  private batchSize: number;
  private flushInterval: number;
  private timeout?: NodeJS.Timeout;

  constructor(
    processor: (batch: T[]) => Promise<R[]>,
    batchSize: number = 10,
    flushInterval: number = 100,
  ) {
    this.processor = processor;
    this.batchSize = batchSize;
    this.flushInterval = flushInterval;
  }

  async add(data: T): Promise<R> {
    return new Promise<R>((resolve, reject) => {
      this.pending.push({ data, resolve, reject });

      // Schedule flush if needed
      if (!this.timeout) {
        this.timeout = setTimeout(() => this.flush(), this.flushInterval);
      }

      // Flush immediately if batch is full
      if (this.pending.length >= this.batchSize) {
        this.flush();
      }
    });
  }

  private async flush(): Promise<void> {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = undefined;
    }

    if (this.pending.length === 0) return;

    const batch = this.pending.splice(0);

    try {
      const results = await this.processor(batch.map((item) => item.data));

      // Resolve each promise with corresponding result
      batch.forEach((item, index) => {
        item.resolve(results[index]);
      });
    } catch (error) {
      // Reject all promises with the error
      batch.forEach((item) => {
        item.reject(error as Error);
      });
    }
  }

  async destroy(): Promise<void> {
    await this.flush();
  }
}

/**
 * Performance-Optimized Memory Operations Decorator
 */
export function withPerformanceOptimization<T extends object>(target: T): T {
  const cache = new MemoryCache();
  const monitor = new PerformanceMonitor();

  return new Proxy(target, {
    get(obj, prop) {
      const value = obj[prop as keyof T];

      if (typeof value === 'function') {
        return async function (...args: unknown[]) {
          const startTime = Date.now();
          const cacheKey = `${String(prop)}_${JSON.stringify(args)}`;

          // Check cache for read operations
          if (String(prop).includes('get') || String(prop).includes('search')) {
            const cached = cache.get(cacheKey);
            if (cached) {
              monitor.recordOperation(String(prop), Date.now() - startTime, true, true);
              return cached;
            }
          }

          try {
            const result = await value.apply(obj, args);

            // Cache successful read operations
            if (String(prop).includes('get') || String(prop).includes('search')) {
              cache.set(cacheKey, result, 300000); // 5 minute TTL
            }

            monitor.recordOperation(String(prop), Date.now() - startTime, true, false);
            return result;
          } catch (error) {
            monitor.recordOperation(String(prop), Date.now() - startTime, false, false);
            throw error;
          }
        };
      }

      return value;
    },
  });
}

export { MemoryCache as default };
