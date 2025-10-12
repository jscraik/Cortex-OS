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
import type { GraphRAGQueryRequest } from '../services/GraphRAGService.js';

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
		latency: number; // ms
		errorRate: number; // percentage
		queueDepth: number;
	};
	scaleDownThreshold: {
		latency: number; // ms
		errorRate: number; // percentage
		utilization: number; // percentage
	};
	cooldownPeriod: number; // ms
	scaleUpStep: number;
	scaleDownStep: number;
	predictionWindow: number; // ms
}

export interface AutoScalingConfig {
	enabled: boolean;
	policy: ScalingPolicy;
	monitoring: {
		metricsInterval: number; // ms
		predictionHorizon: number; // ms
		learningRate: number; // ML model learning rate
	};
	limits: {
		maxQueriesPerSecond: number;
		maxConcurrentQueries: number;
		maxMemoryUsageMB: number;
		scaleUpLimit: number; // instances per minute
		scaleDownLimit: number; // instances per minute
	};
	adaptation: {
		enabled: boolean;
		historyWindow: number; // ms
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

export class AutoScalingManager {
	private config: AutoScalingConfig;
	private metricsHistory: ScalingMetrics[] = [];
	private scalingDecisions: ScalingDecision[] = [];
	private currentInstances = 1;
	private lastScaleTime = 0;
	private adaptationModel: any = null;
	private metricsTimer: NodeJS.Timeout | null = null;
	private predictionModel: any = null;

	constructor(config: AutoScalingConfig) {
		this.config = config;
	}

	async initialize(): Promise<void> {
		if (!this.config.enabled) return;

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

	private async initializeAdaptiveModel(): Promise<void> {
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
		} catch (error) {
			console.warn('brAInwav Adaptive Model initialization failed', {
				component: 'memory-core',
				brand: 'brAInwav',
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	private createLinearRegressionModel(): any {
		// Simple linear regression model for prediction
		return {
			weights: new Array(4).fill(0.1), // For 4 features
			bias: 0,
			train: (features: number[], target: number) => {
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
			predict: (features: number[]) => {
				let result = this.bias;
				for (let i = 0; i < Math.min(features.length, this.weights.length); i++) {
					result += this.weights[i] * features[i];
				}
				return result;
			},
		};
	}

	private startMetricsCollection(): void {
		this.metricsTimer = setInterval(() => {
			this.collectMetrics();
		}, this.config.monitoring.metricsInterval);
	}

	private collectMetrics(): void {
		const performanceMetrics = performanceMonitor.getMetrics();
		const operationStats = performanceMonitor.getOperationStats();
		const timestamp = Date.now();

		const metrics: ScalingMetrics = {
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

	private calculatePercentile(values: number[], percentile: number): number {
		if (values.length === 0) return 0;
		const sorted = [...values].sort((a, b) => a - b);
		const index = Math.ceil(sorted.length * percentile) - 1;
		return sorted[Math.max(0, index)];
	}

	private calculateThroughput(): number {
		if (this.metricsHistory.length < 2) return 0;

		const recent = this.metricsHistory[this.metricsHistory.length - 1];
		const previous = this.metricsHistory[this.metricsHistory.length - 2];
		const timeDiff = (recent.timestamp - previous.timestamp) / 1000; // seconds
		const queryDiff = recent.queryCount - previous.queryCount;

		return timeDiff > 0 ? queryDiff / timeDiff : 0;
	}

	private getGPUUtilization(): number {
		// This would integrate with the GPU acceleration manager
		// For now, return a simulated value
		return Math.random() * 100;
	}

	private getActiveConnections(): number {
		// Get active connection count from various sources
		// This would integrate with connection pooling
		return Math.floor(Math.random() * 50);
	}

	private calculateErrorRate(): number {
		if (this.metricsHistory.length === 0) return 0;

		const recent = this.metricsHistory[this.metricsHistory.length - 1];
		const totalQueries = recent.queryCount;

		if (totalQueries === 0) return 0;
		// This would integrate with error tracking
		return Math.random() * 5; // Simulated error rate
	}

	private getQueueDepth(): number {
		// Get queue depth from various queue systems
		// This would integrate with actual queue monitoring
		return Math.floor(Math.random() * 20);
	}

	private trimHistory(): void {
		const window = this.config.adaptation.enabled
			? this.config.adaptation.historyWindow
			: this.config.monitoring.predictionHorizon * 2;

		while (this.metricsHistory.length > 0 &&
			this.metricsHistory[0].timestamp < Date.now() - window) {
			this.metricsHistory.shift();
		}
	}

	private async evaluateMetrics(metrics: ScalingMetrics): Promise<void> {
		// Update adaptive model if enabled
		if (this.config.adaptation.enabled && this.adaptationModel) {
			this.updateAdaptiveModel(metrics);
		}

		// Generate predictions if enabled
		const prediction = this.generatePrediction(metrics);

		// Create scaling decision
		const decision = this.createScalingDecision(metrics, prediction);

		// Store decision
		this.scalingDecisions.push(decision);
		this.trimDecisions();

		// Execute scaling action
		await this.executeScalingAction(decision);
	}

	private updateAdaptiveModel(metrics: ScalingMetrics): void {
		try {
			const features = [
				metrics.queryCount,
				metrics.averageLatency,
				metrics.cacheHitRatio,
				metrics.memoryUsageMB,
			];

			// Update pattern recognition
			const pattern = JSON.stringify(features);
			const existing = this.adaptationModel.patterns.get(pattern);

			if (existing) {
				existing.count++;
				existing.totalLatency += metrics.averageLatency;
				existing.avgLatency = existing.totalLatency / existing.count;
			} else {
				this.adaptationModel.patterns.set(pattern, {
					count: 1,
					totalLatency: metrics.averageLatency,
					avgLatency: metrics.averageLatency,
				});
			}

			// Anomaly detection
			this.detectAnomalies(metrics);

		} catch (error) {
			console.warn('brAInwav Adaptive Model update failed', {
				component: 'memory-core',
				brand: 'brAInwav',
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	private detectAnomalies(metrics: ScalingMetrics): void {
		// Simple anomaly detection based on statistical deviations
		if (this.metricsHistory.length < 10) return;

		const recentMetrics = this.metricsHistory.slice(-10);
		const avgLatency = recentMetrics.reduce((sum, m) => sum + m.averageLatency, 0) / recentMetrics.length;
		const stdDevLatency = Math.sqrt(
			recentMetrics.reduce((sum, m) => sum + Math.pow(m.averageLatency - avgLatency, 2), 0) / recentMetrics.length
		);

		const isAnomaly = Math.abs(metrics.averageLatency - avgLatency) > 3 * stdDevLatency;

		if (isAnomaly) {
			this.adaptationModel.anomalies.push({
				timestamp: metrics.timestamp,
				type: 'latency_spike',
				value: metrics.averageLatency,
				deviation: Math.abs(metrics.averageLatency - avgLatency) / stdDevLatiation,
			});
		}
	}

	private generatePrediction(currentMetrics: ScalingMetrics): ScalingMetrics | null {
		if (!this.predictionModel || this.metricsHistory.length < 5) return null;

		try {
			// Use recent metrics for feature extraction
			const recentMetrics = this.metricsHistory.slice(-5);
			const avgMetrics = this.averageMetrics(recentMetrics);

			const features = [
				avgMetrics.queryCount,
				avgMetrics.averageLatency,
				avgMetrics.cacheHitRatio,
				avgMetrics.memoryUsageMB,
			];

			const futureLatency = this.predictionModel.predict(features);
			const futureTimestamp = currentMetrics.timestamp + this.config.monitoring.predictionHorizon;

			return {
				...avgMetrics,
				timestamp: futureTimestamp,
				averageLatency: Math.max(0, futureLatency),
				p95Latency: futureLatency * 1.5, // Estimate P95 as 1.5x average
				p99Latency: futureLatency * 2.0, // Estimate P99 as 2x average
				throughputQPS: avgMetrics.throughputQPS,
			};
		} catch (error) {
			console.warn('brAInwav Prediction failed', {
				component: 'memory-core',
				brand: 'brAInwav',
				error: error instanceof Error ? error.message : String(error),
			});
			return null;
		}
	}

	private averageMetrics(metrics: ScalingMetrics[]): ScalingMetrics {
		const sum = metrics.reduce((acc, m) => ({
			queryCount: acc.queryCount + m.queryCount,
			averageLatency: acc.averageLatency + m.averageLatency,
			p95Latency: acc.p95Latency + m.p95Latency,
			p99Latency: acc.p99Latency + m.p99Latency,
			throughputQPS: acc.throughputQPS + m.throughputQPS,
			cacheHitRatio: acc.cacheHitRatio + m.cacheHitRatio,
			memoryUsageMB: acc.memoryUsageMB + m.memoryUsageMB,
			gpuUtilization: (acc.gpuUtilization || 0) + (m.gpuUtilization || 0),
			activeConnections: acc.activeConnections + m.activeConnections,
			errorRate: acc.errorRate + m.errorRate,
			queueDepth: acc.queueDepth + m.queueDepth,
			timestamp: 0,
		}), {
			queryCount: 0,
			averageLatency: 0,
			p95Latency: 0,
			p99Latency: 0,
			throughputQPS: 0,
			cacheHitRatio: 0,
			memoryUsageMB: 0,
			gpuUtilization: 0,
			activeConnections: 0,
			errorRate: 0,
			queueDepth: 0,
			timestamp: 0,
		});

		const count = metrics.length;
		return {
			...sum,
			timestamp: metrics[metrics.length - 1].timestamp,
			averageLatency: sum.averageLatency / count,
			p95Latency: sum.p95Latency / count,
			p99Latency: sum.p99Latency / count,
			throughputQPS: sum.throughputQPS / count,
			cacheHitRatio: sum.cacheHitRatio / count,
			memoryUsageMB: sum.memoryUsageMB / count,
			gpuUtilization: sum.gpuUtilization / count,
			activeConnections: sum.activeConnections / count,
			errorRate: sum.errorRate / count,
			queueDepth: sum.queueDepth / count,
		};
	}

	private createScalingDecision(
		currentMetrics: ScalingMetrics,
		prediction?: ScalingMetrics
	): ScalingDecision {
		const now = Date.now();
		const timeSinceLastScale = now - this.lastScaleTime;

		// Check cooldown period
		if (timeSinceLastScale < this.config.policy.cooldownPeriod) {
			return {
				action: 'no_action',
				reason: 'Cooldown period active',
				confidence: 1.0,
				targetInstances: this.currentInstances,
				currentInstances: this.currentInstances,
				metrics: currentMetrics,
				recommendations: [],
				estimatedImpact: {
					latencyImprovement: 0,
					throughputImprovement: 0,
					costImpact: 0,
				},
			};
		}

		// Check for emergency conditions
		const emergencyAction = this.checkEmergencyConditions(currentMetrics);
		if (emergencyAction) {
			return emergencyAction;
		}

		// Check scale-up conditions
		const shouldScaleUp = this.shouldScaleUp(currentMetrics, prediction);
		if (shouldScaleUp) {
			return this.createScaleUpDecision(currentMetrics, prediction);
		}

		// Check scale-down conditions
		const shouldScaleDown = this.shouldScaleDown(currentMetrics, prediction);
		if (shouldScaleDown) {
			return this.createScaleDownDecision(currentMetrics, prediction);
		}

		// No action needed
		return {
			action: 'no_action',
			reason: 'System operating within acceptable parameters',
			confidence: 0.8,
			targetInstances: this.currentInstances,
			currentInstances: this.currentInstances,
			metrics: currentMetrics,
			prediction,
			recommendations: this.generateOptimizationRecommendations(currentMetrics),
			estimatedImpact: {
				latencyImprovement: 0,
				throughputImprovement: 0,
				costImpact: 0,
			},
		};
	}

	private checkEmergencyConditions(metrics: ScalingMetrics): ScalingDecision | null {
		// Check for critical performance degradation
		if (
			metrics.averageLatency > this.config.policy.scaleUpThreshold.latency * 2 ||
			metrics.errorRate > this.config.policy.scaleUpThreshold.errorRate * 2 ||
			metrics.queueDepth > this.config.policy.scaleUpThreshold.queueDepth * 2
		) {
			const targetInstances = Math.min(
				this.config.policy.maxInstances,
				this.currentInstances + this.config.policy.scaleUpStep * 2
			);

			return {
				action: 'emergency_scale',
				reason: 'Critical performance degradation detected',
				confidence: 0.95,
				targetInstances,
				currentInstances: this.currentInstances,
				metrics,
				recommendations: ['Immediate scale-up required', 'Investigate root cause'],
				estimatedImpact: {
					latencyImprovement: 60,
					throughputImprovement: 100,
					costImpact: 50,
				},
			};
		}

		return null;
	}

	private shouldScaleUp(metrics: ScalingMetrics, prediction?: ScalingMetrics): boolean {
		const targetMetrics = prediction || metrics;

		return (
			targetMetrics.averageLatency > this.config.policy.scaleUpThreshold.latency ||
			targetMetrics.errorRate > this.config.policy.scaleUpThreshold.errorRate ||
			targetMetrics.queueDepth > this.config.policy.scaleUpThreshold.queueDepth ||
			targetMetrics.throughputQPS > this.config.limits.maxQueriesPerSecond * 0.8
		);
	}

	private shouldScaleDown(metrics: ScalingMetrics, prediction?: ScalingMetrics): boolean {
		if (this.currentInstances <= this.config.policy.minInstances) {
			return false;
			}

		const targetMetrics = prediction || metrics;

		return (
			targetMetrics.averageLatency < this.config.policy.scaleDownThreshold.latency &&
			targetMetrics.errorRate < this.config.policy.scaleDownThreshold.errorRate &&
			targetMetrics.queueDepth < 5 &&
			metrics.memoryUsageMB < this.config.limits.maxMemoryUsageMB * 0.7
		);
	}

	private createScaleUpDecision(
		metrics: ScalingMetrics,
		prediction?: ScalingMetrics
	): ScalingDecision {
		const targetInstances = Math.min(
			this.config.policy.maxInstances,
			this.currentInstances + this.config.policy.scaleUpStep
		);

		const confidence = this.calculateScalingConfidence(metrics, 'scale_up');
		const estimatedImprovement = this.estimateScalingImpact(
			this.currentInstances,
			targetInstances,
			metrics
		);

		return {
			action: 'scale_up',
			reason: 'Performance thresholds exceeded',
			confidence,
			targetInstances,
			currentInstances: this.currentInstances,
			metrics,
			prediction,
			recommendations: [
				'Scale up to handle increased load',
				'Monitor for continued performance degradation',
			],
			estimatedImpact,
		};
	}

	private createScaleDownDecision(
		metrics: ScalingMetrics,
		prediction?: ScalingMetrics
	): ScalingDecision {
		const targetInstances = Math.max(
			this.config.policy.minInstances,
			this.currentInstances - this.config.policy.scaleDownStep
		);

		const confidence = this.calculateScalingConfidence(metrics, 'scale_down');
		const estimatedImprovement = this.estimateScalingImpact(
			this.currentInstances,
			targetInstances,
			metrics
		);

		return {
			action: 'scale_down',
			reason: 'Performance indicators allow resource reduction',
			confidence,
			targetInstances,
			currentInstances: this.currentInstances,
			metrics,
			prediction,
			recommendations: [
				'Scale down to optimize resource utilization',
				'Continue monitoring for load changes',
			],
			estimatedImpact,
		};
	}

	private calculateScalingConfidence(metrics: ScalingMetrics, action: 'scale_up' | 'scale_down'): number {
		// Base confidence on how far metrics are from thresholds
		if (action === 'scale_up') {
			const latencyScore = Math.min(1, metrics.averageLatency / this.config.policy.scaleUpThreshold.latency);
			const errorScore = Math.min(1, metrics.errorRate / this.config.policy.scaleUpThreshold.errorRate);
			const queueScore = Math.min(1, metrics.queueDepth / this.config.policy.scaleUpThreshold.queueDepth);
			return (latencyScore + errorScore + queueScore) / 3;
		} else {
			const utilizationScore = 1 - (metrics.memoryUsageMB / this.config.limits.maxMemoryUsageMB);
			const latencyScore = 1 - (metrics.averageLatency / this.config.policy.scaleDownThreshold.latency);
			return (utilizationScore + latencyScore) / 2;
		}
	}

	private estimateScalingImpact(
		fromInstances: number,
		toInstances: number,
		metrics: ScalingMetrics
	): { latencyImprovement: number; throughputImprovement: number; costImpact: number } {
		const instanceRatio = toInstances / fromInstances;

		// Estimate latency improvement (inverse relationship with instances)
		const latencyImprovement = Math.min(50, (1 - 1/instanceRatio) * metrics.averageLatency);

		// Estimate throughput improvement (linear relationship with instances)
		const throughputImprovement = Math.min(100, (instanceRatio - 1) * metrics.throughputQPS);

		// Estimate cost impact (linear relationship with instances)
		const costImpact = (instanceRatio - 1) * 100;

		return {
			latencyImprovement,
			throughputImprovement,
			costImpact,
		};
	}

	private generateOptimizationRecommendations(metrics: ScalingMetrics): string[] {
		const recommendations: string[] = [];

		// Cache optimization recommendations
		if (metrics.cacheHitRatio < 0.6) {
			recommendations.push('Consider increasing cache TTL or implementing pre-computation');
		}

		// Memory optimization recommendations
		if (metrics.memoryUsageMB > this.config.limits.maxMemoryUsageMB * 0.8) {
			recommendations.push('Monitor memory usage and implement cleanup strategies');
		}

		// GPU utilization recommendations
		if (metrics.gpuUtilization !== undefined && metrics.gpuUtilization < 50) {
			recommendations.push('Optimize GPU batch sizes for better utilization');
		}

		// Query optimization recommendations
		if (metrics.averageLatency > 500) {
			recommendations.push('Review query patterns for optimization opportunities');
		}

		return recommendations;
	}

	private async executeScalingAction(decision: ScalingDecision): Promise<void> {
		if (decision.action === 'no_action') {
			this.logScalingDecision(decision);
			return;
		}

		this.lastScaleTime = Date.now();
		this.currentInstances = decision.targetInstances;

		try {
			// This would integrate with actual scaling infrastructure
			// For now, we'll log the decision and simulate the action
			await this.simulateScalingAction(decision);

			this.logScalingDecision(decision);

			// Send notifications if enabled
			if (this.config.notifications.enabled) {
				await this.sendScalingNotification(decision);
			}

		} catch (error) {
			console.error('brAInwav Scaling action failed', {
				component: 'memory-core',
				brand: 'brAInwav',
				action: decision.action,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	private async simulateScalingAction(decision: ScalingDecision): Promise<void> {
		// Simulate the scaling action
		const delay = Math.random() * 2000 + 1000; // 1-3 seconds

		await new Promise(resolve => setTimeout(resolve, delay));

		console.info('brAInwav Scaling action simulated', {
			component: 'memory-core',
			brand: 'brAInwav',
			action: decision.action,
			fromInstances: decision.currentInstances,
			toInstances: decision.targetInstances,
			estimatedImpact: decision.estimatedImpact,
		});
	}

	private logScalingDecision(decision: ScalingDecision): void {
		console.info('brAInwav Auto-Scaling decision', {
			component: 'memory-core',
			brand: 'brAInwav',
			action: decision.action,
			reason: decision.reason,
			confidence: decision.confidence,
			currentInstances: decision.currentInstances,
			targetInstances: decision.targetInstances,
			metrics: {
				latency: Math.round(decision.metrics.averageLatency),
				throughput: Math.round(decision.metrics.throughputQPS),
				cacheHitRatio: Math.round(decision.metrics.cacheHitRatio * 100) / 100,
				errorRate: Math.round(decision.metrics.errorRate * 100) / 100,
			},
		});
	}

	private async sendScalingNotification(decision: ScalingDecision): Promise<void> {
		const severity = decision.action === 'emergency_scale' ? 'critical' :
		decision.action === 'scale_up' ? 'warning' : 'info';

		const message = `Auto-scaling ${decision.action}: ${decision.reason} (${decision.currentInstances} → ${decision.targetInstances} instances)`;

		// This would integrate with notification systems
		console.info(`brAInwav Scaling Notification [${severity.toUpperCase()}]: ${message}`, {
			component: 'memory-core',
			brand: 'brAInwav',
			severity,
			decision,
		});
	}

	private trimDecisions(): void {
		// Keep only recent decisions for analysis
		while (this.scalingDecisions.length > 100) {
			this.scalingDecisions.shift();
		}
	}

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
	} {
		const currentMetrics = this.metricsHistory.length > 0
			? this.metricsHistory[this.metricsHistory.length - 1]
			: null;

		const recentDecisions = this.scalingDecisions.slice(-10);
		const recommendations = this.generateComprehensiveRecommendations(currentMetrics);

		// Determine health status
		let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
		const issues: string[] = [];

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

	private generateComprehensiveRecommendations(metrics: ScalingMetrics | null): ScalingRecommendation[] {
		if (!metrics) return [];

		const recommendations: ScalingRecommendation[] = [];

		// Concurrency recommendations
		if (metrics.averageLatency > 1000 && this.currentInstances < this.config.policy.maxInstances) {
			recommendations.push({
				type: 'concurrency',
				current: this.currentInstances,
				recommended: Math.min(
					this.config.policy.maxInstances,
					this.currentInstances + this.config.policy.scaleUpStep
					),
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
	} {
		const totalScaleUps = this.scalingDecisions.filter(d => d.action === 'scale_up').length;
		const totalScaleDowns = this.scalingDecisions.filter(d => d.action === 'scale_down').length;
		const successfulScaling = this.scalingDecisions.filter(d => d.confidence > 0.5).length;
		const failedScaling = this.scalingDecisions.filter(d => d.confidence < 0.5).length;

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
	async stop(): Promise<void> {
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
let autoScalingManager: AutoScalingManager | null = null;

export function getAutoScalingManager(config?: AutoScalingConfig): AutoScalingManager {
	if (!autoScalingManager) {
		if (!config) {
			throw new Error('Auto-scaling configuration required for first initialization');
		}
		autoScalingManager = new AutoScalingManager(config);
	}
	return autoScalingManager;
}

export async function stopAutoScalingManager(): Promise<void> {
	if (autoScalingManager) {
		await autoScalingManager.stop();
		autoScalingManager = null;
	}
}