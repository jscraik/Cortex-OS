/**
 * Auto-Scaling Manager for brAInwav GraphRAG
 *
 * Intelligent auto-scaling system that:
 * - Monitors performance metrics in real-time
 * - Automatically adjusts resource allocation based on load
 * - Implements predictive scaling algorithms
 * - Provides resource optimization recommendations
 * - Handles graceful scaling transitions
 */
export interface ScalingMetrics {
    timestamp: number;
    queryCount: number;
    averageLatency: number;
    p95Latency: number;
    p99Latency: number;
    throughputQPS: number;
    cacheHitRatio: number;
    memoryUsageMB: number;
    gpuUtilization?: number;
    activeConnections: number;
    errorRate: number;
    queueDepth: number;
}
export interface ScalingPolicy {
    minInstances: number;
    maxInstances: number;
    scaleUpThreshold: {
        latency: number;
        errorRate: number;
        queueDepth: number;
    };
    scaleDownThreshold: {
        latency: number;
        errorRate: number;
        utilization: number;
    };
    cooldownPeriod: number;
    scaleUpStep: number;
    scaleDownStep: number;
    predictionWindow: number;
}
export interface AutoScalingConfig {
    enabled: boolean;
    policy: ScalingPolicy;
    monitoring: {
        metricsInterval: number;
        predictionHorizon: number;
        learningRate: number;
    };
    limits: {
        maxQueriesPerSecond: number;
        maxConcurrentQueries: number;
        maxMemoryUsageMB: number;
        scaleUpLimit: number;
        scaleDownLimit: number;
    };
    adaptation: {
        enabled: boolean;
        historyWindow: number;
        patternRecognition: boolean;
        anomalyDetection: boolean;
    };
    notifications: {
        enabled: boolean;
        thresholds: {
            performance: number;
            scaling: number;
            errors: number;
        };
    };
}
export interface ScalingDecision {
    action: 'scale_up' | 'scale_down' | 'no_action' | 'emergency_scale';
    reason: string;
    confidence: number;
    targetInstances: number;
    currentInstances: number;
    metrics: ScalingMetrics;
    prediction?: ScalingMetrics;
    recommendations: string[];
    estimatedImpact: {
        latencyImprovement: number;
        throughputImprovement: number;
        costImpact: number;
    };
}
export interface ScalingRecommendation {
    type: 'concurrency' | 'batch_size' | 'cache_ttl' | 'gpu_utilization' | 'memory_allocation';
    current: number | boolean;
    recommended: number | boolean;
    impact: {
        performance: number;
        cost: number;
        confidence: number;
    };
    reason: string;
}
export declare class AutoScalingManager {
    private config;
    private metricsHistory;
    private scalingDecisions;
    private currentInstances;
    private metricsTimer;
    private predictionModel;
    constructor(config: AutoScalingConfig);
    initialize(): Promise<void>;
    private initializeAdaptiveModel;
    private createLinearRegressionModel;
    private startMetricsCollection;
    private collectMetrics;
    private calculatePercentile;
    private calculateThroughput;
    private getGPUUtilization;
    private getActiveConnections;
    private calculateErrorRate;
    private getQueueDepth;
    private trimHistory;
    /**
     * Get current scaling status and recommendations
     */
    getScalingStatus(): {
        currentInstances: number;
        currentMetrics: ScalingMetrics | null;
        recentDecisions: ScalingDecision[];
        recommendations: ScalingRecommendation[];
        health: {
            status: 'healthy' | 'degraded' | 'critical';
            issues: string[];
        };
    };
    private generateComprehensiveRecommendations;
    /**
     * Get scaling metrics for analysis
     */
    getMetrics(): {
        history: ScalingMetrics[];
        decisions: ScalingDecision[];
        statistics: {
            totalScaleUps: number;
            totalScaleDowns: number;
            averageResponseTime: number;
            successfulScaling: number;
            failedScaling: number;
        };
    };
    /**
     * Stop auto-scaling manager
     */
    stop(): Promise<void>;
}
export declare function getAutoScalingManager(config?: AutoScalingConfig): AutoScalingManager;
export declare function stopAutoScalingManager(): Promise<void>;
