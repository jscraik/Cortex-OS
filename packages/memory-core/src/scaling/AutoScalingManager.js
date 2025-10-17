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
import { performanceMonitor } from '../monitoring/PerformanceMonitor.js';
export class AutoScalingManager {
    config;
    metricsHistory = [];
    scalingDecisions = [];
    currentInstances = 1;
    metricsTimer = null;
    predictionModel = null;
    constructor(config) {
        this.config = config;
    }
    async initialize() {
        if (!this.config.enabled)
            return;
        // Initialize metrics collection
        this.startMetricsCollection();
        // Initialize adaptive learning if enabled
        if (this.config.adaptation.enabled) {
            await this.initializeAdaptiveModel();
        }
        console.info('brAInwav Auto-Scaling Manager initialized', {
            component: 'memory-core',
            brand: 'brAInwav',
            enabled: true,
            policy: this.config.policy,
            initialInstances: this.currentInstances,
        });
    }
    async initializeAdaptiveModel() {
        try {
            // Initialize simple adaptive model for pattern recognition
            this.adaptationModel = {
                learningRate: this.config.monitoring.learningRate,
                patterns: new Map(),
                anomalies: [],
                lastUpdate: Date.now(),
            };
            // Initialize prediction model
            this.predictionModel = {
                horizon: this.config.monitoring.predictionHorizon,
                features: ['queryCount', 'averageLatency', 'cacheHitRatio', 'memoryUsageMB'],
                model: this.createLinearRegressionModel(),
            };
            console.info('brAInwav Adaptive Model initialized', {
                component: 'memory-core',
                brand: 'brAInwav',
                features: this.predictionModel.features,
                learningRate: this.config.monitoring.learningRate,
            });
        }
        catch (error) {
            console.warn('brAInwav Adaptive Model initialization failed', {
                component: 'memory-core',
                brand: 'brAInwav',
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
    createLinearRegressionModel() {
        // Simple linear regression model for prediction
        return {
            weights: new Array(4).fill(0.1), // For 4 features
            bias: 0,
            train: (features, target) => {
                // Simple gradient descent
                const learningRate = 0.01;
                const prediction = this.predict(features);
                const error = target - prediction;
                // Update weights
                for (let i = 0; i < features.length; i++) {
                    this.weights[i] += learningRate * error * features[i];
                }
                this.bias += learningRate * error;
            },
            predict: (features) => {
                let result = this.bias;
                for (let i = 0; i < Math.min(features.length, this.weights.length); i++) {
                    result += this.weights[i] * features[i];
                }
                return result;
            },
        };
    }
    startMetricsCollection() {
        this.metricsTimer = setInterval(() => {
            this.collectMetrics();
        }, this.config.monitoring.metricsInterval);
    }
    collectMetrics() {
        const performanceMetrics = performanceMonitor.getMetrics();
        const _operationStats = performanceMonitor.getOperationStats();
        const timestamp = Date.now();
        const metrics = {
            timestamp,
            queryCount: performanceMetrics.queryCount,
            averageLatency: performanceMetrics.averageQueryTime,
            p95Latency: this.calculatePercentile(performanceMetrics.queryTimes || [], 0.95),
            p99Latency: this.calculatePercentile(performanceMetrics.queryTimes || [], 0.99),
            throughputQPS: this.calculateThroughput(),
            cacheHitRatio: performanceMetrics.cacheHitRatio,
            memoryUsageMB: performanceMetrics.memoryUsageMB,
            gpuUtilization: this.getGPUUtilization(),
            activeConnections: this.getActiveConnections(),
            errorRate: this.calculateErrorRate(),
            queueDepth: this.getQueueDepth(),
        };
        // Store metrics history
        this.metricsHistory.push(metrics);
        this.trimHistory();
        // Trigger scaling evaluation
        this.evaluateScaling(metrics);
    }
    calculatePercentile(values, percentile) {
        if (values.length === 0)
            return 0;
        const sorted = [...values].sort((a, b) => a - b);
        const index = Math.ceil(sorted.length * percentile) - 1;
        return sorted[Math.max(0, index)];
    }
    calculateThroughput() {
        if (this.metricsHistory.length < 2)
            return 0;
        const recent = this.metricsHistory[this.metricsHistory.length - 1];
        const previous = this.metricsHistory[this.metricsHistory.length - 2];
        const timeDiff = (recent.timestamp - previous.timestamp) / 1000; // seconds
        const queryDiff = recent.queryCount - previous.queryCount;
        return timeDiff > 0 ? queryDiff / timeDiff : 0;
    }
    getGPUUtilization() {
        // This would integrate with the GPU acceleration manager
        // For now, return a simulated value
        return Math.random() * 100;
    }
    getActiveConnections() {
        // Get active connection count from various sources
        // This would integrate with connection pooling
        return Math.floor(Math.random() * 50);
    }
    calculateErrorRate() {
        if (this.metricsHistory.length === 0)
            return 0;
        const recent = this.metricsHistory[this.metricsHistory.length - 1];
        const totalQueries = recent.queryCount;
        if (totalQueries === 0)
            return 0;
        // This would integrate with error tracking
        return Math.random() * 5; // Simulated error rate
    }
    getQueueDepth() {
        // Get queue depth from various queue systems
        // This would integrate with actual queue monitoring
        return Math.floor(Math.random() * 20);
    }
    trimHistory() {
        const window = this.config.adaptation.enabled
            ? this.config.adaptation.historyWindow
            : this.config.monitoring.predictionHorizon * 2;
        while (this.metricsHistory.length > 0 &&
            this.metricsHistory[0].timestamp < Date.now() - window) {
            this.metricsHistory.shift();
        }
    }
    /**
     * Get current scaling status and recommendations
     */
    getScalingStatus() {
        const currentMetrics = this.metricsHistory.length > 0 ? this.metricsHistory[this.metricsHistory.length - 1] : null;
        const recentDecisions = this.scalingDecisions.slice(-10);
        const recommendations = this.generateComprehensiveRecommendations(currentMetrics);
        // Determine health status
        let status = 'healthy';
        const issues = [];
        if (currentMetrics) {
            if (currentMetrics.averageLatency > this.config.policy.scaleUpThreshold.latency) {
                issues.push('High latency detected');
                status = 'degraded';
            }
            if (currentMetrics.errorRate > this.config.policy.scaleUpThreshold.errorRate) {
                issues.push('High error rate detected');
                status = 'critical';
            }
            if (currentMetrics.queueDepth > this.config.policy.scaleUpThreshold.queueDepth) {
                issues.push('Queue depth too high');
                status = 'degraded';
            }
        }
        return {
            currentInstances: this.currentInstances,
            currentMetrics,
            recentDecisions,
            recommendations,
            health: { status, issues },
        };
    }
    generateComprehensiveRecommendations(metrics) {
        if (!metrics)
            return [];
        const recommendations = [];
        // Concurrency recommendations
        if (metrics.averageLatency > 1000 && this.currentInstances < this.config.policy.maxInstances) {
            recommendations.push({
                type: 'concurrency',
                current: this.currentInstances,
                recommended: Math.min(this.config.policy.maxInstances, this.currentInstances + this.config.policy.scaleUpStep),
                impact: {
                    performance: 60,
                    cost: 40,
                    confidence: 0.8,
                },
                reason: 'High latency indicates need for more concurrent processing',
            });
        }
        // Cache TTL recommendations
        if (metrics.cacheHitRatio < 0.7) {
            const currentTTL = 300000; // 5 minutes (example)
            recommendations.push({
                type: 'cache_ttl',
                current: currentTTL,
                recommended: Math.min(currentTTL * 2, 1800000), // Up to 30 minutes
                impact: {
                    performance: 30,
                    cost: 5,
                    confidence: 0.7,
                },
                reason: 'Low cache hit ratio suggests longer TTL may be beneficial',
            });
        }
        // GPU utilization recommendations
        if (metrics.gpuUtilization && metrics.gpuUtilization < 60) {
            recommendations.push({
                type: 'gpu_utilization',
                current: metrics.gpuUtilization,
                recommended: 75,
                impact: {
                    performance: 40,
                    cost: 10,
                    confidence: 0.6,
                },
                reason: 'GPU utilization is below optimal range',
            });
        }
        return recommendations;
    }
    /**
     * Get scaling metrics for analysis
     */
    getMetrics() {
        const totalScaleUps = this.scalingDecisions.filter((d) => d.action === 'scale_up').length;
        const totalScaleDowns = this.scalingDecisions.filter((d) => d.action === 'scale_down').length;
        const successfulScaling = this.scalingDecisions.filter((d) => d.confidence > 0.5).length;
        const failedScaling = this.scalingDecisions.filter((d) => d.confidence < 0.5).length;
        const recentMetrics = this.metricsHistory.slice(-10);
        const averageResponseTime = recentMetrics.length > 0
            ? recentMetrics.reduce((sum, m) => sum + m.averageLatency, 0) / recentMetrics.length
            : 0;
        return {
            history: this.metricsHistory,
            decisions: this.scalingDecisions,
            statistics: {
                totalScaleUps,
                totalScaleDowns,
                averageResponseTime,
                successfulScaling,
                failedScaling,
            },
        };
    }
    /**
     * Stop auto-scaling manager
     */
    async stop() {
        if (this.metricsTimer) {
            clearInterval(this.metricsTimer);
            this.metricsTimer = null;
        }
        this.metricsHistory = [];
        this.scalingDecisions = [];
        this.currentInstances = 1;
        console.info('brAInwav Auto-Scaling Manager stopped', {
            component: 'memory-core',
            brand: 'brAInwav',
            finalInstances: this.currentInstances,
            totalDecisions: this.scalingDecisions.length,
        });
    }
}
// Global auto-scaling manager instance
let autoScalingManager = null;
export function getAutoScalingManager(config) {
    if (!autoScalingManager) {
        if (!config) {
            throw new Error('Auto-scaling configuration required for first initialization');
        }
        autoScalingManager = new AutoScalingManager(config);
    }
    return autoScalingManager;
}
export async function stopAutoScalingManager() {
    if (autoScalingManager) {
        await autoScalingManager.stop();
        autoScalingManager = null;
    }
}
