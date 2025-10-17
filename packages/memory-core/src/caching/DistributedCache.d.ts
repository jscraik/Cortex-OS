/**
 * Distributed Redis Caching for brAInwav GraphRAG
 *
 * High-performance distributed caching system with:
 * - Redis cluster support with automatic failover
 * - Intelligent cache key generation and versioning
 * - Advanced eviction policies and memory management
 * - Cache warming strategies and pre-computation
 * - Performance monitoring and metrics
 */
export interface CacheConfig {
    redis: {
        host: string;
        port: number;
        password?: string;
        db?: number;
        keyPrefix?: string;
    };
    cache: {
        defaultTTL: number;
        maxMemory: string;
        evictionPolicy: 'allkeys-lru' | 'allkeys-lfu' | 'volatile-lru' | 'volatile-lfu';
        compressionEnabled: boolean;
        serializationFormat: 'json' | 'messagepack';
    };
    monitoring: {
        enabled: boolean;
        metricsInterval: number;
        alertThresholds: {
            hitRatio: number;
            latency: number;
            memoryUsage: number;
        };
    };
}
export interface CacheEntry<T = any> {
    data: T;
    timestamp: number;
    ttl: number;
    version: string;
    compressed: boolean;
}
export interface CacheMetrics {
    totalHits: number;
    totalMisses: number;
    hitRatio: number;
    averageLatency: number;
    memoryUsage: number;
    keyCount: number;
    evictions: number;
    errors: number;
}
export declare class DistributedCache {
    private redis;
    private config;
    private metrics;
    private latencyHistory;
    private readonly MAX_LATENCY_HISTORY;
    private keyVersion;
    constructor(config: CacheConfig);
    private setupEventHandlers;
    private startMetricsCollection;
    private checkAlertThresholds;
    initialize(): Promise<void>;
    private generateCacheKey;
    private serialize;
    private deserialize;
    get<T>(key: string, namespace?: string): Promise<T | null>;
    set<T>(key: string, data: T, options?: {
        ttl?: number;
        namespace?: string;
        version?: string;
    }): Promise<void>;
    delete(key: string, namespace?: string): Promise<void>;
    invalidateNamespace(namespace: string): Promise<void>;
    invalidatePattern(pattern: string): Promise<void>;
    warmCache<T>(entries: Array<{
        key: string;
        data: T;
        namespace?: string;
        ttl?: number;
    }>): Promise<void>;
    getMetrics(): CacheMetrics;
    private updateLatency;
    healthCheck(): Promise<{
        status: 'healthy' | 'unhealthy' | 'degraded';
        connected: boolean;
        memoryUsage: number;
        hitRatio: number;
        latency: number;
    }>;
    close(): Promise<void>;
}
export declare function getDistributedCache(config?: CacheConfig): DistributedCache;
export declare function closeDistributedCache(): Promise<void>;
