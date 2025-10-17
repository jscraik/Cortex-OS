/**
 * Advanced Query Pattern Analysis with ML Optimization
 *
 * Intelligent system that analyzes query patterns, predicts performance bottlenecks,
 * and provides ML-based optimization recommendations for brAInwav GraphRAG.
 *
 * Features:
 * - Real-time query pattern recognition and clustering
 * - Performance prediction using machine learning models
 * - Intelligent caching strategies based on usage patterns
 * - Query optimization recommendations
 * - Anomaly detection for performance issues
 * - Adaptive learning from user feedback
 */
import type { GraphRAGQueryRequest, GraphRAGResult } from '../services/GraphRAGService.js';
export interface QueryPattern {
    id: string;
    pattern: string;
    frequency: number;
    averageLatency: number;
    successRate: number;
    lastSeen: number;
    sampleQueries: GraphRAGQueryRequest[];
    optimizationHints: string[];
    complexity: 'low' | 'medium' | 'high';
}
export interface MLModel {
    id: string;
    type: 'latency_prediction' | 'cache_optimization' | 'resource_allocation';
    version: string;
    accuracy: number;
    lastTrained: number;
    featureCount: number;
    predictionCount: number;
}
export interface OptimizationRecommendation {
    id: string;
    type: 'cache' | 'index' | 'query_rewrite' | 'resource_allocation';
    priority: 'low' | 'medium' | 'high' | 'critical';
    impact: number;
    confidence: number;
    description: string;
    implementation: string;
    expectedImprovement: string;
    dependencies: string[];
}
export interface QueryFeatures {
    textLength: number;
    wordCount: number;
    entityCount: number;
    hasComplexOperators: boolean;
    filterComplexity: number;
    expectedResults: number;
    historicalLatency: number;
    cacheHitProbability: number;
    resourceIntensity: number;
}
export interface PredictionResult {
    predictedLatency: number;
    confidence: number;
    bottlenecks: string[];
    optimizationSuggestions: OptimizationRecommendation[];
    resourceRequirements: {
        memory: number;
        cpu: number;
        gpu: boolean;
        network: number;
    };
}
export interface MLOptimizationConfig {
    enabled: boolean;
    patternAnalysis: {
        enabled: boolean;
        minSamples: number;
        clusterThreshold: number;
        maxPatterns: number;
        updateInterval: number;
    };
    mlModels: {
        latencyPrediction: {
            enabled: boolean;
            modelType: 'linear' | 'tree' | 'neural';
            trainInterval: number;
            minTrainingSamples: number;
            maxTrainingSamples: number;
        };
        cacheOptimization: {
            enabled: boolean;
            predictionHorizon: number;
            optimizationThreshold: number;
        };
    };
    optimization: {
        autoApply: boolean;
        manualReviewRequired: boolean;
        maxConcurrentOptimizations: number;
        optimizationCooldown: number;
    };
    monitoring: {
        anomalyDetection: boolean;
        performanceDegradationThreshold: number;
        alertThreshold: number;
    };
}
export interface MLOptimizationMetrics {
    totalQueries: number;
    patternsDetected: number;
    predictionsMade: number;
    optimizationRecommendations: number;
    optimizationsApplied: number;
    averagePredictionAccuracy: number;
    anomaliesDetected: number;
    modelPerformance: Record<string, {
        accuracy: number;
        latency: number;
        confidence: number;
    }>;
}
/**
 * ML-based Query Pattern Analyzer and Optimizer
 */
export declare class MLOptimizationManager {
    private config;
    private queryPatterns;
    private mlModels;
    private queryHistory;
    private recommendations;
    private metrics;
    private analysisTimer;
    private trainingTimer;
    constructor(config: MLOptimizationConfig);
    initialize(): Promise<void>;
    private initializeLatencyPredictionModel;
    private initializeCacheOptimizationModel;
    /**
     * Analyze query and extract features for ML processing
     */
    analyzeQuery(query: GraphRAGQueryRequest, history?: GraphRAGQueryRequest[]): Promise<QueryFeatures>;
    /**
     * Predict query performance using ML models
     */
    predictPerformance(query: GraphRAGQueryRequest, features: QueryFeatures): Promise<PredictionResult>;
    /**
     * Record query result for continuous learning
     */
    recordQueryResult(query: GraphRAGQueryRequest, features: QueryFeatures, result: GraphRAGResult, latency: number): Promise<void>;
    /**
     * Get optimization recommendations
     */
    getOptimizationRecommendations(): Promise<OptimizationRecommendation[]>;
    /**
     * Apply optimization recommendations
     */
    applyOptimization(recommendationId: string): Promise<boolean>;
    private extractEntities;
    private hasComplexOperators;
    private calculateFilterComplexity;
    private estimateResultCount;
    private getHistoricalLatency;
    private calculateCacheHitProbability;
    private calculateResourceIntensity;
    private predictLatency;
    private calculatePredictionConfidence;
    private identifyBottlenecks;
    private generateOptimizationSuggestions;
    private estimateResourceRequirements;
    private getDefaultPrediction;
    private updateQueryPatterns;
    private generatePatternKey;
    private calculatePatternComplexity;
    private detectPerformanceAnomalies;
    private startPatternAnalysis;
    private startModelTraining;
    private analyzePatterns;
    private trainModels;
    /**
     * Get current metrics and status
     */
    getMetrics(): {
        metrics: MLOptimizationMetrics;
        patterns: QueryPattern[];
        models: MLModel[];
        recommendations: OptimizationRecommendation[];
    };
    /**
     * Health check for ML optimization
     */
    healthCheck(): Promise<{
        healthy: boolean;
        modelsAvailable: boolean;
        lastAnalysis: number;
        anomalies: number;
        recommendations: number;
    }>;
    /**
     * Stop ML optimization manager
     */
    stop(): Promise<void>;
}
export declare function getMLOptimizationManager(config?: MLOptimizationConfig): MLOptimizationManager;
export declare function stopMLOptimizationManager(): Promise<void>;
