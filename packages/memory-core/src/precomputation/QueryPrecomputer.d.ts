/**
 * Query Pre-computation System for brAInwav GraphRAG
 *
 * Advanced pre-computation system that:
 * - Analyzes query patterns and predicts common queries
 * - Pre-computes results for frequently used queries
 * - Maintains a pre-computation schedule based on usage patterns
 * - Implements intelligent result freshness management
 * - Provides ML-based query pattern recognition
 */
import type { DistributedCache } from '../caching/DistributedCache.js';
import type { GraphRAGSearchResult } from '../retrieval/QdrantHybrid.js';
import type { GraphRAGQueryRequest } from '../services/GraphRAGService.js';
export interface QueryPattern {
    id: string;
    pattern: string;
    frequency: number;
    lastUsed: number;
    averageLatency: number;
    confidence: number;
    precomputedResults?: PrecomputedResult[];
}
export interface PrecomputedResult {
    query: GraphRAGQueryRequest;
    results: GraphRAGSearchResult[];
    timestamp: number;
    ttl: number;
    freshnessScore: number;
    accessCount: number;
    lastAccessed: number;
}
export interface PrecomputationConfig {
    enabled: boolean;
    maxPrecomputedQueries: number;
    patternAnalysis: {
        minFrequency: number;
        confidenceThreshold: number;
        analysisWindow: number;
    };
    scheduling: {
        interval: number;
        maxConcurrentJobs: number;
        offPeakHours: number[];
    };
    freshness: {
        defaultTTL: number;
        maxTTL: number;
        refreshThreshold: number;
    };
    cache: {
        distributedCacheNamespace: string;
        compressionEnabled: boolean;
    };
}
export declare class QueryPrecomputer {
    private config;
    private queryPatterns;
    private precomputedResults;
    private queryHistory;
    private distributedCache;
    private isRunning;
    private precomputationTimer;
    constructor(config: PrecomputationConfig);
    initialize(distributedCache?: DistributedCache): Promise<void>;
    private loadFromCache;
    private startPrecomputationScheduler;
    private runPrecomputationCycle;
    private analyzeQueryPatterns;
    private extractQueryPattern;
    private identifyPrecomputationCandidates;
    private precomputeQueries;
    private generateRepresentativeQuery;
    private performPrecomputation;
    private cleanupStaleResults;
    private isResultFresh;
    private saveToCache;
    recordQuery(query: GraphRAGQueryRequest, latency: number): void;
    getPrecomputedResult(query: GraphRAGQueryRequest): Promise<GraphRAGSearchResult[] | null>;
    private generatePatternId;
    private generateResultKey;
    getStats(): {
        patternCount: number;
        precomputedCount: number;
        averagePatternFrequency: number;
        cacheHitRate: number;
    };
    stop(): Promise<void>;
}
export declare function getQueryPrecomputer(config?: PrecomputationConfig): QueryPrecomputer;
export declare function stopQueryPrecomputer(): Promise<void>;
