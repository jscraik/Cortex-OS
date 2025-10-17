/**
 * CDN Cache Manager for brAInwav GraphRAG
 *
 * Advanced CDN caching system that provides:
 * - Multi-tier static content caching with CDN integration
 * - Intelligent cache warming and invalidation strategies
 * - Geographic content distribution optimization
 * - Automatic compression and optimization
 * - Real-time cache performance monitoring
 * - Adaptive cache TTL based on content patterns
 */
export interface CDNConfig {
    enabled: boolean;
    provider: 'cloudflare' | 'aws-cloudfront' | 'fastly' | 'akamai' | 'custom';
    zoneId?: string;
    apiToken?: string;
    distributionId?: string;
    customEndpoint?: string;
    cacheKeyPrefix: string;
    defaultTTL: number;
    maxTTL: number;
    staleWhileRevalidate: number;
    staleIfError: number;
    compression: {
        enabled: boolean;
        level: number;
        types: string[];
    };
    optimization: {
        autoMinify: boolean;
        imageOptimization: boolean;
        brotliCompression: boolean;
        http2Push: boolean;
    };
    monitoring: {
        enabled: boolean;
        realTimeMetrics: boolean;
        alertingEnabled: boolean;
        logLevel: 'debug' | 'info' | 'warn' | 'error';
    };
    geographic: {
        enabled: boolean;
        regions: string[];
        defaultRegion: string;
        fallbackRegion: string;
    };
}
export interface CDNCacheEntry {
    key: string;
    url: string;
    contentType: string;
    size: number;
    compressedSize: number;
    cacheStatus: 'HIT' | 'MISS' | 'EXPIRED' | 'BYPASS';
    region: string;
    ttl: number;
    age: number;
    lastAccessed: number;
    hitCount: number;
    etag?: string;
    lastModified?: string;
    compressionRatio?: number;
}
export interface CDNMetrics {
    totalRequests: number;
    cacheHits: number;
    cacheMisses: number;
    hitRatio: number;
    averageLatency: number;
    averageServedSize: number;
    totalBandwidthSaved: number;
    regionalStats: Record<string, {
        requests: number;
        hitRatio: number;
        latency: number;
    }>;
    contentTypeStats: Record<string, {
        requests: number;
        hitRatio: number;
        averageSize: number;
    }>;
    compressionStats: {
        originalSize: number;
        compressedSize: number;
        savings: number;
        ratio: number;
    };
    errors: number;
    lastUpdated: number;
}
export interface CacheInvalidationRule {
    id: string;
    pattern: string;
    type: 'path' | 'prefix' | 'tag' | 'regex';
    condition?: {
        contentType?: string;
        region?: string;
        age?: number;
    };
    action: 'invalidate' | 'purge' | 'refresh';
    scheduled?: boolean;
    schedule?: string;
}
export interface WarmingStrategy {
    id: string;
    name: string;
    patterns: string[];
    priority: 'low' | 'medium' | 'high';
    frequency: 'once' | 'daily' | 'hourly' | 'on-demand';
    regions: string[];
    maxConcurrent: number;
    lastExecuted: number;
    nextExecution: number;
}
/**
 * CDN Cache Manager for static content optimization
 */
export declare class CDNCacheManager {
    private config;
    private metrics;
    private cacheEntries;
    private invalidationRules;
    private warmingStrategies;
    private metricsTimer;
    private warmingTimer;
    constructor(config: CDNConfig);
    initialize(): Promise<void>;
    private initializeCDNProvider;
    /**
     * Generate CDN cache key for content
     */
    generateCacheKey(content: any, context?: {
        contentType?: string;
        region?: string;
        version?: string;
    }): string;
    /**
     * Cache static content with optimization
     */
    cacheContent(content: any, url: string, options?: {
        contentType?: string;
        ttl?: number;
        region?: string;
        compress?: boolean;
        tags?: string[];
    }): Promise<{
        cacheKey: string;
        url: string;
        size: number;
        compressedSize: number;
        cacheStatus: string;
    }>;
    /**
     * Retrieve cached content
     */
    getCachedContent(cacheKey: string, options?: {
        region?: string;
        acceptStale?: boolean;
    }): Promise<{
        content?: any;
        cacheStatus: 'HIT' | 'MISS' | 'EXPIRED' | 'BYPASS';
        age: number;
        ttl: number;
    }>;
    /**
     * Invalidate cache entries
     */
    invalidateCache(pattern: string, options?: {
        type?: 'path' | 'prefix' | 'tag' | 'regex';
        region?: string;
        contentType?: string;
    }): Promise<{
        invalidatedCount: number;
        pattern: string;
        duration: number;
    }>;
    /**
     * Warm cache with popular content
     */
    warmCache(strategy: WarmingStrategy): Promise<{
        warmedCount: number;
        skippedCount: number;
        errors: number;
        duration: number;
    }>;
    private shouldCompress;
    private compressContent;
    private hashContent;
    private updateMetrics;
    private updateRegionalStats;
    private updateHitRatio;
    private setupDefaultInvalidationRules;
    private setupDefaultWarmingStrategies;
    private calculateNextExecution;
    private startMetricsCollection;
    private startCacheWarming;
    private collectMetrics;
    private executeScheduledWarming;
    /**
     * Get current metrics and status
     */
    getMetrics(): {
        metrics: CDNMetrics;
        cacheEntries: number;
        invalidationRules: number;
        warmingStrategies: number;
        config: CDNConfig;
    };
    /**
     * Health check for CDN cache manager
     */
    healthCheck(): Promise<{
        healthy: boolean;
        provider: string;
        cacheEntries: number;
        hitRatio: number;
        lastMetricsUpdate: number;
        errors: number;
    }>;
    /**
     * Stop CDN cache manager
     */
    stop(): Promise<void>;
}
export declare function getCDNCacheManager(config?: CDNConfig): CDNCacheManager;
export declare function stopCDNCacheManager(): Promise<void>;
