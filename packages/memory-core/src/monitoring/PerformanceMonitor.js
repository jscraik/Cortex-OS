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
export class PerformanceMonitor {
    metrics = {
        queryCount: 0,
        averageQueryTime: 0,
        cacheHitRatio: 0,
        totalCacheHits: 0,
        totalCacheMisses: 0,
        memoryUsageMB: 0,
        externalProviderStats: {},
    };
    queryHistory = [];
    MAX_HISTORY_SIZE = 1000;
    startTime = Date.now();
    /**
     * Record a query performance event
     */
    recordQuery(query) {
        const endTime = Date.now();
        const duration = endTime - query.startTime;
        const queryPerformance = {
            ...query,
            duration,
            endTime,
        };
        // Update metrics
        this.metrics.queryCount++;
        this.metrics.averageQueryTime =
            (this.metrics.averageQueryTime * (this.metrics.queryCount - 1) + duration) /
                this.metrics.queryCount;
        if (query.cacheHit) {
            this.metrics.totalCacheHits++;
        }
        else {
            this.metrics.totalCacheMisses++;
        }
        this.metrics.cacheHitRatio =
            this.metrics.totalCacheHits / (this.metrics.totalCacheHits + this.metrics.totalCacheMisses);
        // Add to history
        this.queryHistory.push(queryPerformance);
        if (this.queryHistory.length > this.MAX_HISTORY_SIZE) {
            this.queryHistory.shift();
        }
        console.log('brAInwav GraphRAG query performance recorded', {
            component: 'memory-core',
            brand: 'brAInwav',
            queryId: query.queryId,
            operation: query.operation,
            duration,
            cacheHit: query.cacheHit,
            resultCount: query.resultCount,
        });
    }
    /**
     * Record external provider performance
     */
    recordExternalProviderCall(provider, latency, success) {
        if (!this.metrics.externalProviderStats[provider]) {
            this.metrics.externalProviderStats[provider] = {
                callCount: 0,
                averageLatency: 0,
                errorCount: 0,
            };
        }
        const stats = this.metrics.externalProviderStats[provider];
        stats.callCount++;
        stats.averageLatency =
            (stats.averageLatency * (stats.callCount - 1) + latency) / stats.callCount;
        if (!success) {
            stats.errorCount++;
        }
    }
    /**
     * Update memory usage metrics
     */
    updateMemoryUsage() {
        if (typeof process !== 'undefined' && process.memoryUsage) {
            const usage = process.memoryUsage();
            this.metrics.memoryUsageMB = Math.round((usage.heapUsed / 1024 / 1024) * 100) / 100;
        }
    }
    /**
     * Get current performance metrics
     */
    getMetrics() {
        this.updateMemoryUsage();
        const recentQueries = this.queryHistory.slice(-100); // Last 100 queries
        const recentQueryCount = recentQueries.length;
        const recentAverageLatency = recentQueries.length > 0
            ? recentQueries.reduce((sum, q) => sum + q.duration, 0) / recentQueries.length
            : 0;
        return {
            ...this.metrics,
            uptimeSeconds: Math.round((Date.now() - this.startTime) / 1000),
            recentQueryCount,
            recentAverageLatency: Math.round(recentAverageLatency * 100) / 100,
        };
    }
    /**
     * Get performance summary for health checks
     */
    getPerformanceSummary() {
        const metrics = this.getMetrics();
        const issues = [];
        const recommendations = [];
        // Check cache performance
        if (metrics.cacheHitRatio < 0.3 && metrics.queryCount > 10) {
            issues.push('Low cache hit ratio');
            recommendations.push('Consider increasing cache TTL or size');
        }
        // Check query latency
        if (metrics.averageQueryTime > 5000) {
            issues.push('High average query latency');
            recommendations.push('Optimize database queries or add more caching');
        }
        // Check memory usage
        if (metrics.memoryUsageMB > 500) {
            issues.push('High memory usage');
            recommendations.push('Implement more aggressive cache cleanup');
        }
        // Check external provider performance
        for (const [provider, stats] of Object.entries(metrics.externalProviderStats)) {
            if (stats.errorCount / stats.callCount > 0.1) {
                issues.push(`High error rate for ${provider}`);
                recommendations.push(`Check ${provider} configuration and connectivity`);
            }
            if (stats.averageLatency > 10000) {
                issues.push(`High latency for ${provider}`);
                recommendations.push(`Consider reducing timeout or adding caching for ${provider}`);
            }
        }
        let status = 'healthy';
        if (issues.length >= 3) {
            status = 'critical';
        }
        else if (issues.length > 0) {
            status = 'warning';
        }
        return { status, issues, recommendations };
    }
    /**
     * Reset all metrics
     */
    reset() {
        this.metrics = {
            queryCount: 0,
            averageQueryTime: 0,
            cacheHitRatio: 0,
            totalCacheHits: 0,
            totalCacheMisses: 0,
            memoryUsageMB: 0,
            externalProviderStats: {},
        };
        this.queryHistory = [];
        this.startTime = Date.now();
        console.log('brAInwav GraphRAG performance monitor reset', {
            component: 'memory-core',
            brand: 'brAInwav',
        });
    }
    /**
     * Export metrics for external monitoring systems
     */
    exportMetrics() {
        const metrics = this.getMetrics();
        return JSON.stringify({
            timestamp: new Date().toISOString(),
            metrics,
            summary: this.getPerformanceSummary(),
        }, null, 2);
    }
    /**
     * Get operation-specific statistics
     */
    getOperationStats() {
        const stats = {};
        for (const query of this.queryHistory) {
            if (!stats[query.operation]) {
                stats[query.operation] = {
                    count: 0,
                    totalDuration: 0,
                    errorCount: 0,
                };
            }
            stats[query.operation].count++;
            stats[query.operation].totalDuration += query.duration;
            if (query.error) {
                stats[query.operation].errorCount++;
            }
        }
        // Convert to final format
        const result = {};
        for (const [operation, data] of Object.entries(stats)) {
            result[operation] = {
                count: data.count,
                averageDuration: Math.round((data.totalDuration / data.count) * 100) / 100,
                successRate: Math.round((1 - data.errorCount / data.count) * 1000) / 1000,
            };
        }
        return result;
    }
}
// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();
/**
 * Performance monitoring decorator for methods
 */
export function monitorPerformance(operation) {
    return (_target, _propertyName, descriptor) => {
        const method = descriptor.value;
        descriptor.value = async function (...args) {
            const queryId = `perf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            const startTime = Date.now();
            const cacheHit = false;
            let resultCount = 0;
            let error;
            try {
                const result = await method.apply(this, args);
                // Try to extract result count from different return types
                if (Array.isArray(result)) {
                    resultCount = result.length;
                }
                else if (result && typeof result === 'object') {
                    if ('chunks' in result && Array.isArray(result.chunks)) {
                        resultCount = result.chunks.length;
                    }
                    else if ('results' in result && Array.isArray(result.results)) {
                        resultCount = result.results.length;
                    }
                }
                return result;
            }
            catch (err) {
                error = err instanceof Error ? err.message : String(err);
                throw err;
            }
            finally {
                performanceMonitor.recordQuery({
                    queryId,
                    startTime,
                    operation: operation,
                    cacheHit,
                    resultCount,
                    error,
                });
            }
        };
        return descriptor;
    };
}
