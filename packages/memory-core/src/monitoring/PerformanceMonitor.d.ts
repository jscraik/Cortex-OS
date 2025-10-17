/**
 * Performance monitoring system for brAInwav GraphRAG
 *
 * Provides comprehensive metrics collection and analysis for:
 * - Query performance tracking
 * - Cache hit/miss ratios
 * - Resource utilization monitoring
 * - External provider performance
 * - Memory usage tracking
 */
export interface PerformanceMetrics {
    queryCount: number;
    averageQueryTime: number;
    cacheHitRatio: number;
    totalCacheHits: number;
    totalCacheMisses: number;
    memoryUsageMB: number;
    externalProviderStats: {
        [provider: string]: {
            callCount: number;
            averageLatency: number;
            errorCount: number;
        };
    };
}
export interface QueryPerformance {
    queryId: string;
    startTime: number;
    endTime: number;
    duration: number;
    operation: 'hybrid_search' | 'graph_expansion' | 'context_assembly' | 'external_citation';
    cacheHit: boolean;
    resultCount: number;
    error?: string;
}
export declare class PerformanceMonitor {
    private metrics;
    private queryHistory;
    private readonly MAX_HISTORY_SIZE;
    private startTime;
    /**
     * Record a query performance event
     */
    recordQuery(query: Omit<QueryPerformance, 'duration' | 'endTime'>): void;
    /**
     * Record external provider performance
     */
    recordExternalProviderCall(provider: string, latency: number, success: boolean): void;
    /**
     * Update memory usage metrics
     */
    updateMemoryUsage(): void;
    /**
     * Get current performance metrics
     */
    getMetrics(): PerformanceMetrics & {
        uptimeSeconds: number;
        recentQueryCount: number;
        recentAverageLatency: number;
    };
    /**
     * Get performance summary for health checks
     */
    getPerformanceSummary(): {
        status: 'healthy' | 'warning' | 'critical';
        issues: string[];
        recommendations: string[];
    };
    /**
     * Reset all metrics
     */
    reset(): void;
    /**
     * Export metrics for external monitoring systems
     */
    exportMetrics(): string;
    /**
     * Get operation-specific statistics
     */
    getOperationStats(): Record<string, {
        count: number;
        averageDuration: number;
        successRate: number;
    }>;
}
export declare const performanceMonitor: PerformanceMonitor;
/**
 * Performance monitoring decorator for methods
 */
export declare function monitorPerformance(operation: string): (_target: any, _propertyName: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
