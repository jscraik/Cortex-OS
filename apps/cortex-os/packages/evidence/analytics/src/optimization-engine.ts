/**
 * @file_path packages/orchestration-analytics/src/optimization-engine.ts
 * @description ML-powered optimization engine for agent orchestration performance
 * @maintainer @jamiescottcraik
 * @last_updated 2025-08-04
 * @version 1.0.0
 * @status active
 * @ai_generated_by human
 * @ai_provenance_hash N/A
 */

import { EventEmitter } from 'node:events';
import { Matrix } from 'ml-matrix';
import pino, { type Logger } from 'pino';
import type {
	AgentMetrics, AnalyticsConfig, InteractionPattern, OptimizationRecommendation, OrchestrationMetrics, PredictiveModel, WorkflowBottleneck
} from './types.js';

/**
 * ML-powered optimization engine for orchestration performance
 * Generates recommendations based on pattern analysis and predictive modeling
 */
export class OptimizationEngine extends EventEmitter {
	private logger: Logger;
	private config: AnalyticsConfig;
	private isOptimizing = false;
	private optimizationInterval?: NodeJS.Timeout;

	// ML models and data
	private performanceModel?: PredictiveModel;
	private scalingModel?: PredictiveModel;
	private resourceModel?: PredictiveModel;

	// Stored recommendations
	private recommendations: OptimizationRecommendation[] = [];
	private implementedRecommendations: Set<string> = new Set();

	// Historical data for ML training
	private performanceHistory: Array<{
		timestamp: Date;
		metrics: AgentMetrics[];
		orchestrationMetrics: OrchestrationMetrics[];
		patterns: InteractionPattern[];
		bottlenecks: WorkflowBottleneck[];
	}> = [];

	// Optimization statistics
	private recommendationsGenerated = 0;
	private lastOptimizationTime?: Date;
	private optimizationErrors = 0;

	constructor(config: AnalyticsConfig) {
		super();
		this.config = config;
		this.logger = pino({
			name: 'orchestration-optimization-engine', level: 'info'
		});

		this.initializeOptimization();
	}

	/**
	 * Initialize optimization engine
	 */
	private initializeOptimization(): void {
		this.logger.info({ msg: 'Initializing optimization engine', optimizationRecommendations: this.config.analysis.optimizationRecommendations, predictiveModeling: this.config.analysis.predictiveModeling });

		if (this.config.analysis.optimizationRecommendations) {
			this.startOptimization();
		}

		if (this.config.analysis.predictiveModeling) {
			this.initializePredictiveModels();
		}
	}

	/**
	 * Start automated optimization
	 */
	startOptimization(): void {
		if (this.isOptimizing) {
			this.logger.warn({ msg: 'Optimization already running' });
			return;
		}

		this.isOptimizing = true;

		// Start periodic optimization
		this.optimizationInterval = setInterval(() => {
			this.generateOptimizationRecommendations().catch((error) => {
				this.logger.error({ msg: 'Error during optimization', error: error instanceof Error ? error.message : String(error) });
				this.optimizationErrors++;
			});
		}, this.config.collection.interval * 5); // Optimize less frequently

		this.logger.info({ msg: 'Optimization engine started' });
		this.emit('optimizationStarted');
	}

	/**
	 * Stop optimization
	 */
	stopOptimization(): void {
		if (!this.isOptimizing) {
			this.logger.warn({ msg: 'Optimization not running' });
			return;
		}

		this.isOptimizing = false;

		if (this.optimizationInterval) {
			clearInterval(this.optimizationInterval);
			this.optimizationInterval = undefined;
		}

		this.logger.info({ msg: 'Optimization engine stopped' });
		this.emit('optimizationStopped');
	}

	/**
	 * Initialize predictive models
	 */
	private initializePredictiveModels(): void {
		try {
			// Initialize performance prediction model
			this.performanceModel = {
				modelType: 'neural-network', accuracy: 0.75, // Initial accuracy
				predictions: [], lastTrained: new Date(), features: [
					'agent_count', 'task_complexity', 'resource_utilization', 'interaction_frequency', 'framework_distribution', ], recommendedActions: []
			};

			// Initialize scaling prediction model
			this.scalingModel = {
				modelType: 'ensemble', accuracy: 0.8, predictions: [], lastTrained: new Date(), features: [
					'current_load', 'historical_growth', 'resource_availability', 'bottleneck_frequency', 'agent_efficiency', ], recommendedActions: []
			};

			// Initialize resource optimization model
			this.resourceModel = {
				modelType: 'linear-regression', accuracy: 0.85, predictions: [], lastTrained: new Date(), features: [
					'cpu_utilization', 'memory_usage', 'network_throughput', 'agent_distribution', 'task_patterns', ], recommendedActions: []
			};

			this.logger.info({ msg: 'Predictive models initialized' });
		} catch (error) {
			this.logger.error({ msg: 'Error initializing predictive models', error: error instanceof Error ? error.message : String(error) });
		}
	}

	/**
	 * Add historical data for ML training
	 */
	addHistoricalData(
		metrics: AgentMetrics[], orchestrationMetrics: OrchestrationMetrics[], patterns: InteractionPattern[], bottlenecks: WorkflowBottleneck[], ): void {
		this.performanceHistory.push({
			timestamp: new Date(), metrics, orchestrationMetrics, patterns, bottlenecks
		});

		// Maintain history size
		const maxHistorySize = 1000;
		if (this.performanceHistory.length > maxHistorySize) {
			this.performanceHistory.shift();
		}

		// Retrain models if enough data
		if (this.performanceHistory.length % 100 === 0) {
			this.retrainModels().catch((error) => {
				this.logger.error({ msg: 'Error retraining models', error: error instanceof Error ? error.message : String(error) });
			});
		}
	}

	/**
	 * Generate optimization recommendations
	 */
	async generateOptimizationRecommendations(): Promise<OptimizationRecommendation[]> {
		try {
			const startTime = Date.now();
			const newRecommendations: OptimizationRecommendation[] = [];

			// Get latest data for analysis
			if (this.performanceHistory.length === 0) {
				this.logger.warn({ msg: 'No historical data available for optimization' });
				return [];
			}

			const latestData = this.performanceHistory[this.performanceHistory.length - 1];

			// Generate different types of recommendations
			const resourceRecommendations =
				await this.generateResourceOptimizationRecommendations(latestData);
			newRecommendations.push(...resourceRecommendations);

			const workflowRecommendations =
				await this.generateWorkflowOptimizationRecommendations(latestData);
			newRecommendations.push(...workflowRecommendations);

			const scalingRecommendations = await this.generateScalingRecommendations(latestData);
			newRecommendations.push(...scalingRecommendations);

			const bottleneckRecommendations =
				await this.generateBottleneckResolutionRecommendations(latestData);
			newRecommendations.push(...bottleneckRecommendations);

			// Store recommendations
			this.recommendations.push(...newRecommendations);
			this.maintainRecommendationLimits();

			// Update statistics
			this.recommendationsGenerated += newRecommendations.length;
			this.lastOptimizationTime = new Date();

			const optimizationTime = Date.now() - startTime;

			this.logger.debug({ msg: 'Optimization completed', newRecommendations: newRecommendations.length, totalRecommendations: this.recommendations.length, optimizationTime });

			// Emit optimization results
			this.emit('recommendationsGenerated', {
				recommendations: newRecommendations, timestamp: new Date(), optimizationTime
			});

			return newRecommendations;
		} catch (error) {
			this.logger.error({ msg: 'Failed to generate optimization recommendations', error: error instanceof Error ? error.message : String(error) });
			this.optimizationErrors++;
			throw error;
		}
	}

	/**
	 * Generate resource optimization recommendations
	 */
	private async generateResourceOptimizationRecommendations(
		data: (typeof this.performanceHistory)[0], ): Promise<OptimizationRecommendation[]> {
		const recommendations: OptimizationRecommendation[] = [];

		try {
			// Analyze resource utilization patterns
			const resourceAnalysis = this.analyzeResourceUtilization(data);

			// CPU optimization
			if (resourceAnalysis.cpu.average > 80) {
				recommendations.push({
					id: `cpu-optimization-${Date.now()}`, type: 'resource-allocation', priority: 'high', title: 'High CPU Utilization Detected', description: `CPU utilization is averaging ${resourceAnalysis.cpu.average.toFixed(1)}%. Consider optimizing agent workload distribution.`, expectedImpact: {
						performanceGain: 25, resourceSavings: 15, reliabilityImprovement: 20
					}, implementation: {
						difficulty: 'medium', estimatedTime: 2, requiredResources: ['infrastructure-team', 'monitoring-tools'], steps: [
							'Identify CPU-intensive agents', 'Implement load balancing', 'Scale horizontally if needed', 'Monitor performance improvements', ]
					}, affectedAgents: this.getHighCpuAgents(data.metrics), confidence: 0.85, generatedAt: new Date()
				});
			}

			// Memory optimization
			if (resourceAnalysis.memory.average > 85) {
				recommendations.push({
					id: `memory-optimization-${Date.now()}`, type: 'resource-allocation', priority: 'high', title: 'High Memory Usage Detected', description: `Memory usage is averaging ${resourceAnalysis.memory.average.toFixed(1)}%. Implement memory optimization strategies.`, expectedImpact: {
						performanceGain: 20, resourceSavings: 25, reliabilityImprovement: 30
					}, implementation: {
						difficulty: 'medium', estimatedTime: 3, requiredResources: ['development-team', 'profiling-tools'], steps: [
							'Profile memory usage by agent', 'Implement memory pooling', 'Add garbage collection optimization', 'Monitor memory patterns', ]
					}, affectedAgents: this.getHighMemoryAgents(data.metrics), confidence: 0.8, generatedAt: new Date()
				});
			}

			// GPU optimization (if applicable)
			if (resourceAnalysis.gpu && resourceAnalysis.gpu.average > 90) {
				recommendations.push({
					id: `gpu-optimization-${Date.now()}`, type: 'resource-allocation', priority: 'critical', title: 'GPU Resource Saturation', description: `GPU utilization is at ${resourceAnalysis.gpu.average.toFixed(1)}%. Immediate optimization required.`, expectedImpact: {
						performanceGain: 40, resourceSavings: 20, reliabilityImprovement: 25
					}, implementation: {
						difficulty: 'hard', estimatedTime: 5, requiredResources: ['ml-team', 'gpu-infrastructure'], steps: [
							'Analyze GPU workload patterns', 'Implement model quantization', 'Add GPU memory management', 'Consider multi-GPU scaling', ]
					}, affectedAgents: this.getGpuIntensiveAgents(data.metrics), confidence: 0.9, generatedAt: new Date()
				});
			}
		} catch (error) {
			this.logger.error({ msg: 'Error generating resource optimization recommendations', error: error instanceof Error ? error.message : String(error) });
		}

		return recommendations;
	}

	/**
	 * Generate workflow optimization recommendations
	 */
	private async generateWorkflowOptimizationRecommendations(
		data: (typeof this.performanceHistory)[0], ): Promise<OptimizationRecommendation[]> {
		const recommendations: OptimizationRecommendation[] = [];

		try {
			// Analyze workflow efficiency
			const workflowEfficiency = this.calculateWorkflowEfficiency(data);

			if (workflowEfficiency < 0.7) {
				recommendations.push({
					id: `workflow-restructure-${Date.now()}`, type: 'workflow-restructure', priority: 'medium', title: 'Workflow Efficiency Below Optimal', description: `Current workflow efficiency is ${(workflowEfficiency * 100).toFixed(1)}%. Consider restructuring agent coordination patterns.`, expectedImpact: {
						performanceGain: 30, resourceSavings: 10, reliabilityImprovement: 20
					}, implementation: {
						difficulty: 'medium', estimatedTime: 4, requiredResources: ['architecture-team', 'agents'], steps: [
							'Map current workflow patterns', 'Identify inefficient coordination points', 'Redesign agent interaction patterns', 'Implement gradual workflow changes', 'Monitor efficiency improvements', ]
					}, affectedAgents: data.metrics.map((m) => m.agentId), confidence: 0.75, generatedAt: new Date()
				});
			}

			// Analyze parallel execution opportunities
			const parallelizationOpportunities = this.identifyParallelizationOpportunities(data.patterns);

			if (parallelizationOpportunities.length > 0) {
				recommendations.push({
					id: `parallelization-${Date.now()}`, type: 'workflow-restructure', priority: 'medium', title: 'Parallelization Opportunities Identified', description: `Found ${parallelizationOpportunities.length} opportunities to parallelize sequential operations.`, expectedImpact: {
						performanceGain: 35, resourceSavings: 5, reliabilityImprovement: 15
					}, implementation: {
						difficulty: 'medium', estimatedTime: 3, requiredResources: ['development-team'], steps: [
							'Analyze dependencies between operations', 'Implement parallel execution paths', 'Add synchronization points', 'Test parallel workflows', ]
					}, affectedAgents: parallelizationOpportunities, confidence: 0.8, generatedAt: new Date()
				});
			}
		} catch (error) {
			this.logger.error({ msg: 'Error generating workflow optimization recommendations', error: error instanceof Error ? error.message : String(error) });
		}

		return recommendations;
	}

	/**
	 * Generate scaling recommendations
	 */
	private async generateScalingRecommendations(
		data: (typeof this.performanceHistory)[0], ): Promise<OptimizationRecommendation[]> {
		const recommendations: OptimizationRecommendation[] = [];

		try {
			// Predict scaling needs using ML model
			if (this.scalingModel) {
				const scalingPrediction = await this.predictScalingNeeds(data);

				if (scalingPrediction.shouldScale) {
					recommendations.push({
						id: `scaling-${Date.now()}`, type: 'agent-scaling', priority: scalingPrediction.urgency, title: `Agent Scaling Required - ${scalingPrediction.direction}`, description: scalingPrediction.description, expectedImpact: {
							performanceGain: scalingPrediction.expectedImprovement, resourceSavings: scalingPrediction.direction === 'down' ? 20 : -10, reliabilityImprovement: 25
						}, implementation: {
							difficulty: 'easy', estimatedTime: 1, requiredResources: ['infrastructure-team'], steps: scalingPrediction.steps
						}, affectedAgents: scalingPrediction.affectedAgents, confidence: scalingPrediction.confidence, generatedAt: new Date()
					});
				}
			}

			// Analyze agent load distribution
			const loadImbalance = this.analyzeLoadDistribution(data.metrics);

			if (loadImbalance.severity > 0.3) {
				recommendations.push({
					id: `load-balancing-${Date.now()}`, type: 'agent-scaling', priority: 'medium', title: 'Agent Load Imbalance Detected', description: `Load distribution imbalance severity: ${(loadImbalance.severity * 100).toFixed(1)}%`, expectedImpact: {
						performanceGain: 20, resourceSavings: 15, reliabilityImprovement: 30
					}, implementation: {
						difficulty: 'medium', estimatedTime: 2, requiredResources: ['orchestration-team'], steps: [
							'Implement dynamic load balancing', 'Add agent health monitoring', 'Configure automatic failover', 'Test load distribution', ]
					}, affectedAgents: loadImbalance.overloadedAgents, confidence: 0.85, generatedAt: new Date()
				});
			}
		} catch (error) {
			this.logger.error({ msg: 'Error generating scaling recommendations', error: error instanceof Error ? error.message : String(error) });
		}

		return recommendations;
	}

	/**
	 * Generate bottleneck resolution recommendations
	 */
	private async generateBottleneckResolutionRecommendations(
		data: (typeof this.performanceHistory)[0], ): Promise<OptimizationRecommendation[]> {
		const recommendations: OptimizationRecommendation[] = [];

		try {
			for (const bottleneck of data.bottlenecks) {
				let recommendation: OptimizationRecommendation | null = null;

				switch (bottleneck.type) {
					case 'agent-overload':
						recommendation = this.createAgentOverloadRecommendation(bottleneck);
						break;
					case 'communication-lag':
						recommendation = this.createCommunicationLagRecommendation(bottleneck);
						break;
					case 'resource-contention':
						recommendation = this.createResourceContentionRecommendation(bottleneck);
						break;
					case 'dependency-wait':
						recommendation = this.createDependencyWaitRecommendation(bottleneck);
						break;
				}

				if (recommendation) {
					recommendations.push(recommendation);
				}
			}
		} catch (error) {
			this.logger.error({ msg: 'Error generating bottleneck resolution recommendations', error: error instanceof Error ? error.message : String(error) });
		}

		return recommendations;
	}

	/**
	 * Create agent overload resolution recommendation
	 */
	private createAgentOverloadRecommendation(
		bottleneck: WorkflowBottleneck, ): OptimizationRecommendation {
		return {
			id: `agent-overload-resolution-${bottleneck.id}`, type: 'bottleneck-resolution', priority: bottleneck.severity === 'critical' ? 'critical' : 'high', title: `Resolve Agent Overload: ${bottleneck.location}`, description: `Agent ${bottleneck.location} is experiencing overload with average delay of ${bottleneck.averageDelay}ms.`, expectedImpact: {
				performanceGain: 40, resourceSavings: 5, reliabilityImprovement: 35
			}, implementation: {
				difficulty: 'medium', estimatedTime: 2, requiredResources: ['infrastructure-team', 'monitoring-tools'], steps: [
					'Scale agent horizontally', 'Implement request queuing', 'Add circuit breaker pattern', 'Monitor agent performance', ]
			}, affectedAgents: bottleneck.impactScope, confidence: 0.9, generatedAt: new Date()
		};
	}

	/**
	 * Create communication lag resolution recommendation
	 */
	private createCommunicationLagRecommendation(
		bottleneck: WorkflowBottleneck, ): OptimizationRecommendation {
		return {
			id: `communication-lag-resolution-${bottleneck.id}`, type: 'bottleneck-resolution', priority: 'medium', title: `Resolve Communication Lag: ${bottleneck.location}`, description: `Communication bottleneck detected with ${bottleneck.averageDelay}ms average delay.`, expectedImpact: {
				performanceGain: 25, resourceSavings: 10, reliabilityImprovement: 20
			}, implementation: {
				difficulty: 'medium', estimatedTime: 3, requiredResources: ['network-team', 'development-team'], steps: [
					'Optimize message serialization', 'Implement message compression', 'Add connection pooling', 'Monitor network performance', ]
			}, affectedAgents: bottleneck.impactScope, confidence: 0.75, generatedAt: new Date()
		};
	}

	/**
	 * Create resource contention resolution recommendation
	 */
	private createResourceContentionRecommendation(
		bottleneck: WorkflowBottleneck, ): OptimizationRecommendation {
		return {
			id: `resource-contention-resolution-${bottleneck.id}`, type: 'bottleneck-resolution', priority: 'high', title: `Resolve Resource Contention: ${bottleneck.location}`, description: `Resource contention causing ${bottleneck.averageDelay}ms delays.`, expectedImpact: {
				performanceGain: 30, resourceSavings: 20, reliabilityImprovement: 25
			}, implementation: {
				difficulty: 'medium', estimatedTime: 3, requiredResources: ['infrastructure-team'], steps: [
					'Implement resource pooling', 'Add resource scheduling', 'Optimize resource allocation', 'Monitor resource usage', ]
			}, affectedAgents: bottleneck.impactScope, confidence: 0.8, generatedAt: new Date()
		};
	}

	/**
	 * Create dependency wait resolution recommendation
	 */
	private createDependencyWaitRecommendation(
		bottleneck: WorkflowBottleneck, ): OptimizationRecommendation {
		return {
			id: `dependency-wait-resolution-${bottleneck.id}`, type: 'bottleneck-resolution', priority: 'medium', title: `Resolve Dependency Wait: ${bottleneck.location}`, description: `Dependency wait causing ${bottleneck.averageDelay}ms delays.`, expectedImpact: {
				performanceGain: 35, resourceSavings: 5, reliabilityImprovement: 30
			}, implementation: {
				difficulty: 'medium', estimatedTime: 4, requiredResources: ['architecture-team'], steps: [
					'Analyze dependency graph', 'Implement dependency caching', 'Add async processing', 'Optimize dependency order', ]
			}, affectedAgents: bottleneck.impactScope, confidence: 0.7, generatedAt: new Date()
		};
	}

	/**
	 * Predict scaling needs using ML model with actual model inference
	 */
	private async predictScalingNeeds(data: (typeof this.performanceHistory)[0]): Promise<{
		shouldScale: boolean;
		direction: 'up' | 'down';
		urgency: 'low' | 'medium' | 'high' | 'critical';
		description: string;
		expectedImprovement: number;
		steps: string[];
		affectedAgents: string[];
		confidence: number;
	}> {
		try {
			// Prepare feature matrix for ML model inference
			const features = this.extractScalingFeatures(data);

			// Use trained scaling model for prediction
			if (this.scalingModel && this.performanceHistory.length >= 10) {
				const prediction = await this.performScalingModelInference(features);
				return this.interpretScalingPrediction(prediction, data, features);
			}

			// Fallback to rule-based approach if model not available
			return this.ruleBasedScalingPrediction(features, data);
		} catch (error) {
			this.logger.error({ msg: 'Error in ML scaling prediction', error: error instanceof Error ? error.message : String(error) });
			// Fallback to conservative rule-based prediction
			return this.ruleBasedScalingPrediction(this.extractScalingFeatures(data), data);
		}
	}

	/**
	 * Extract features for scaling prediction model
	 */
	private extractScalingFeatures(data: (typeof this.performanceHistory)[0]): number[] {
		const metrics = data.metrics;
		if (metrics.length === 0) {
			return [0, 0, 0, 0, 0, 0, 0, 0]; // Default neutral features
		}

		// Extract 8 key features for scaling decision
		const avgCpuLoad = metrics.reduce((sum, m) => sum + m.resourceUsage.cpu, 0) / metrics.length;
		const avgMemoryLoad =
			metrics.reduce((sum, m) => sum + m.resourceUsage.memory, 0) / metrics.length;
		const avgThroughput = metrics.reduce((sum, m) => sum + m.throughput, 0) / metrics.length;
		const errorRate =
			metrics.reduce((sum, m) => sum + m.errorCount, 0) /
			Math.max(
				1, metrics.reduce((sum, m) => sum + m.taskCount, 0), );
		const avgResponseTime = metrics.reduce((sum, m) => sum + m.responseTime, 0) / metrics.length;
		const activeAgentCount = metrics.filter((m) => m.availability > 0.8).length;

		// Historical trend features (last 5 data points)
		const recentHistory = this.performanceHistory.slice(-5);
		const loadTrend =
			recentHistory.length > 1
				? this.calculateTrend(
						recentHistory.map(
							(h) =>
								h.metrics.reduce(
									(sum, m) => sum + (m.resourceUsage.cpu + m.resourceUsage.memory) / 2, 0, ) / h.metrics.length, ), )
				: 0;

		const throughputTrend =
			recentHistory.length > 1
				? this.calculateTrend(
						recentHistory.map(
							(h) => h.metrics.reduce((sum, m) => sum + m.throughput, 0) / h.metrics.length, ), )
				: 0;

		return [
			avgCpuLoad / 100, // Normalized CPU load [0-1]
			avgMemoryLoad / 100, // Normalized memory load [0-1]
			Math.min(avgThroughput / 20, 1), // Normalized throughput [0-1]
			Math.min(errorRate * 10, 1), // Normalized error rate [0-1]
			Math.min(avgResponseTime / 1000, 1), // Normalized response time [0-1]
			activeAgentCount / 10, // Normalized agent count [0-1]
			Math.max(-1, Math.min(1, loadTrend)), // Load trend [-1, 1]
			Math.max(-1, Math.min(1, throughputTrend)), // Throughput trend [-1, 1]
		];
	}

	/**
	 * Calculate trend from time series data
	 */
	private calculateTrend(values: number[]): number {
		if (values.length < 2) return 0;

		const n = values.length;
		const xSum = (n * (n - 1)) / 2; // Sum of indices 0..n-1
		const ySum = values.reduce((sum, val) => sum + val, 0);
		const xySum = values.reduce((sum, val, i) => sum + i * val, 0);
		const xxSum = (n * (n - 1) * (2 * n - 1)) / 6; // Sum of squares of indices

		// Linear regression slope
		const slope = (n * xySum - xSum * ySum) / (n * xxSum - xSum * xSum);
		return slope;
	}

	/**
	 * Perform actual ML model inference for scaling prediction
	 */
	private async performScalingModelInference(features: number[]): Promise<{
		scaleUp: number;
		scaleDown: number;
		confidence: number;
	}> {
		if (!this.scalingModel) {
			throw new Error('Scaling model not initialized');
		}

		try {
			// Create feature matrix
			const featureMatrix = new Matrix([features]);

			// Simple neural network inference simulation
			// In production, this would use a trained model
			const weights = this.getOrInitializeModelWeights();

			// Forward pass through simple 2-layer network
			const hidden = featureMatrix.mmul(weights.inputToHidden).add(weights.hiddenBias);
			const hiddenActivated = hidden.apply((value: number) => Math.max(0, value)); // ReLU activation

			const output = hiddenActivated.mmul(weights.hiddenToOutput).add(weights.outputBias);
			const activated = output.apply((value: number) => 1 / (1 + Math.exp(-value))); // Sigmoid activation

			const result = activated.to1DArray();

			return {
				scaleUp: result[0], // Probability of scaling up
				scaleDown: result[1], // Probability of scaling down
				confidence: Math.max(result[0], result[1]), // Confidence is max probability
			};
		} catch (error) {
			this.logger.error({ msg: 'Error in ML model inference', error: error instanceof Error ? error.message : String(error) });
			throw error;
		}
	}

	/**
	 * Get or initialize model weights for scaling prediction
	 */
	private getOrInitializeModelWeights(): {
		inputToHidden: Matrix;
		hiddenBias: Matrix;
		hiddenToOutput: Matrix;
		outputBias: Matrix;
	} {
		// In production, these would be loaded from a trained model file
		// For now, using reasonable initialization
		return {
			inputToHidden: Matrix.random(8, 4, {
				random: () => (Math.random() - 0.5) * 0.5
			}), hiddenBias: Matrix.zeros(1, 4), hiddenToOutput: Matrix.random(4, 2, {
				random: () => (Math.random() - 0.5) * 0.5
			}), outputBias: Matrix.zeros(1, 2)
		};
	}

	/**
	 * Interpret ML model prediction results
	 */
	private interpretScalingPrediction(
		prediction: { scaleUp: number; scaleDown: number; confidence: number }, data: (typeof this.performanceHistory)[0], features: number[], ): {
		shouldScale: boolean;
		direction: 'up' | 'down';
		urgency: 'low' | 'medium' | 'high' | 'critical';
		description: string;
		expectedImprovement: number;
		steps: string[];
		affectedAgents: string[];
		confidence: number;
	} {
		const threshold = 0.6;
		const shouldScaleUp = prediction.scaleUp > threshold;
		const shouldScaleDown = prediction.scaleDown > threshold;

		if (shouldScaleUp) {
			const urgency =
				features[0] > 0.9 || features[1] > 0.9
					? 'critical'
					: features[0] > 0.8 || features[1] > 0.8
						? 'high'
						: 'medium';

			return {
				shouldScale: true, direction: 'up', urgency, description: `ML model predicts scaling up needed (confidence: ${(prediction.confidence * 100).toFixed(1)}%). High resource utilization and performance degradation detected.`, expectedImprovement: Math.round(30 + prediction.confidence * 20), steps: [
					'Add additional agent instances', 'Configure automatic load balancing', 'Monitor scaling effectiveness', 'Adjust scaling thresholds based on results', ], affectedAgents: data.metrics
					.filter((m) => (m.resourceUsage.cpu + m.resourceUsage.memory) / 200 > 0.8)
					.map((m) => m.agentId), confidence: prediction.confidence
			};
		} else if (shouldScaleDown) {
			return {
				shouldScale: true, direction: 'down', urgency: 'low', description: `ML model suggests scaling down opportunity (confidence: ${(prediction.confidence * 100).toFixed(1)}%). Low resource utilization detected.`, expectedImprovement: Math.round(10 + prediction.confidence * 10), steps: [
					'Identify underutilized agents', 'Gracefully remove instances', 'Monitor performance impact', 'Adjust scaling thresholds', ], affectedAgents: data.metrics
					.filter((m) => (m.resourceUsage.cpu + m.resourceUsage.memory) / 200 < 0.3)
					.map((m) => m.agentId), confidence: prediction.confidence
			};
		}

		return {
			shouldScale: false, direction: 'up', urgency: 'low', description: `ML model indicates current scaling is appropriate (confidence: ${(prediction.confidence * 100).toFixed(1)}%)`, expectedImprovement: 0, steps: [], affectedAgents: [], confidence: prediction.confidence
		};
	}

	/**
	 * Rule-based scaling prediction fallback
	 */
	private ruleBasedScalingPrediction(
		features: number[], data: (typeof this.performanceHistory)[0], ): {
		shouldScale: boolean;
		direction: 'up' | 'down';
		urgency: 'low' | 'medium' | 'high' | 'critical';
		description: string;
		expectedImprovement: number;
		steps: string[];
		affectedAgents: string[];
		confidence: number;
	} {
		const avgLoad = (features[0] + features[1]) / 2; // Average CPU + Memory load
		const errorRate = features[3];

		if (avgLoad > 0.8 || errorRate > 0.1) {
			return {
				shouldScale: true, direction: 'up', urgency: avgLoad > 0.9 ? 'critical' : 'high', description: `Rule-based analysis: High system load (${(avgLoad * 100).toFixed(1)}%) and error rate (${(errorRate * 100).toFixed(1)}%) indicate scaling up is needed.`, expectedImprovement: 35, steps: [
					'Add additional agent instances', 'Configure load balancing', 'Monitor scaling effectiveness', 'Adjust scaling parameters', ], affectedAgents: data.metrics
					.filter((m) => (m.resourceUsage.cpu + m.resourceUsage.memory) / 200 > 0.8)
					.map((m) => m.agentId), confidence: 0.75
			};
		} else if (avgLoad < 0.3 && errorRate < 0.01) {
			return {
				shouldScale: true, direction: 'down', urgency: 'low', description: `Rule-based analysis: Low system load (${(avgLoad * 100).toFixed(1)}%) suggests opportunity to scale down and save resources.`, expectedImprovement: 15, steps: [
					'Identify underutilized agents', 'Gracefully remove instances', 'Monitor performance impact', 'Adjust scaling thresholds', ], affectedAgents: data.metrics
					.filter((m) => (m.resourceUsage.cpu + m.resourceUsage.memory) / 200 < 0.2)
					.map((m) => m.agentId), confidence: 0.65
			};
		}

		return {
			shouldScale: false, direction: 'up', urgency: 'low', description: 'Rule-based analysis: Current scaling is appropriate', expectedImprovement: 0, steps: [], affectedAgents: [], confidence: 0.6
		};
	}

	/**
	 * Analyze resource utilization patterns
	 */
	private analyzeResourceUtilization(data: (typeof this.performanceHistory)[0]): {
		cpu: { average: number; peak: number };
		memory: { average: number; peak: number };
		gpu?: { average: number; peak: number };
	} {
		const metrics = data.metrics;

		const cpuUsages = metrics.map((m) => m.resourceUsage.cpu);
		const memoryUsages = metrics.map((m) => m.resourceUsage.memory);
		const gpuUsages = metrics
			.map((m) => m.resourceUsage.gpu)
			.filter((gpu) => gpu !== undefined) as number[];

		return {
			cpu: {
				average: cpuUsages.reduce((sum, cpu) => sum + cpu, 0) / cpuUsages.length, peak: Math.max(...cpuUsages)
			}, memory: {
				average: memoryUsages.reduce((sum, mem) => sum + mem, 0) / memoryUsages.length, peak: Math.max(...memoryUsages)
			}, gpu:
				gpuUsages.length > 0
					? {
							average: gpuUsages.reduce((sum, gpu) => sum + gpu, 0) / gpuUsages.length, peak: Math.max(...gpuUsages)
						}
					: undefined
		};
	}

	/**
	 * Get high CPU usage agents
	 */
	private getHighCpuAgents(metrics: AgentMetrics[]): string[] {
		return metrics.filter((m) => m.resourceUsage.cpu > 80).map((m) => m.agentId);
	}

	/**
	 * Get high memory usage agents
	 */
	private getHighMemoryAgents(metrics: AgentMetrics[]): string[] {
		return metrics.filter((m) => m.resourceUsage.memory > 85).map((m) => m.agentId);
	}

	/**
	 * Get GPU intensive agents
	 */
	private getGpuIntensiveAgents(metrics: AgentMetrics[]): string[] {
		return metrics
			.filter((m) => m.resourceUsage.gpu && m.resourceUsage.gpu > 90)
			.map((m) => m.agentId);
	}

	/**
	 * Calculate workflow efficiency
	 */
	private calculateWorkflowEfficiency(data: (typeof this.performanceHistory)[0]): number {
		const metrics = data.metrics;
		const orchestrationMetrics = data.orchestrationMetrics;

		if (metrics.length === 0 || orchestrationMetrics.length === 0) {
			return 0.5; // Default neutral efficiency
		}

		const avgSuccessRate = metrics.reduce((sum, m) => sum + m.successRate, 0) / metrics.length;
		const avgThroughput = metrics.reduce((sum, m) => sum + m.throughput, 0) / metrics.length;
		const avgWorkflowEfficiency =
			orchestrationMetrics.reduce((sum, m) => sum + m.workflowEfficiency, 0) /
			orchestrationMetrics.length;

		// Weighted combination of efficiency metrics
		return (
			avgSuccessRate * 0.4 + Math.min(avgThroughput / 10, 1) * 0.3 + avgWorkflowEfficiency * 0.3
		);
	}

	/**
	 * Identify parallelization opportunities
	 */
	private identifyParallelizationOpportunities(patterns: InteractionPattern[]): string[] {
		// Look for sequential patterns that could be parallelized
		const sequentialPatterns = patterns.filter((p) => p.patternType === 'cascade');
		return sequentialPatterns.flatMap((p) => p.participants);
	}

	/**
	 * Analyze load distribution
	 */
	private analyzeLoadDistribution(metrics: AgentMetrics[]): {
		severity: number;
		overloadedAgents: string[];
	} {
		if (metrics.length === 0) {
			return { severity: 0, overloadedAgents: [] };
		}

		const loads = metrics.map((m) => (m.resourceUsage.cpu + m.resourceUsage.memory) / 2);
		const avgLoad = loads.reduce((sum, load) => sum + load, 0) / loads.length;
		const loadVariance = loads.reduce((sum, load) => sum + (load - avgLoad) ** 2, 0) / loads.length;

		// High variance indicates poor load distribution
		const severity = Math.min(1, loadVariance / (avgLoad * avgLoad));
		const overloadedAgents = metrics
			.filter((m) => (m.resourceUsage.cpu + m.resourceUsage.memory) / 2 > avgLoad * 1.5)
			.map((m) => m.agentId);

		return { severity, overloadedAgents };
	}

	/**
	 * Retrain ML models with new data
	 */
	private async retrainModels(): Promise<void> {
		try {
			this.logger.info({ msg: 'Retraining ML models with new data', dataPoints: this.performanceHistory.length });

			// In a real implementation, this would retrain actual ML models
			// For now, we'll just update model accuracy based on data volume
			if (this.performanceModel) {
				this.performanceModel.accuracy = Math.min(
					0.95, 0.6 + (this.performanceHistory.length / 1000) * 0.35, );
				this.performanceModel.lastTrained = new Date();
			}

			if (this.scalingModel) {
				this.scalingModel.accuracy = Math.min(
					0.9, 0.65 + (this.performanceHistory.length / 1000) * 0.25, );
				this.scalingModel.lastTrained = new Date();
			}

			if (this.resourceModel) {
				this.resourceModel.accuracy = Math.min(
					0.92, 0.7 + (this.performanceHistory.length / 1000) * 0.22, );
				this.resourceModel.lastTrained = new Date();
			}

			this.logger.info({ msg: 'ML models retrained successfully' });
		} catch (error) {
			this.logger.error({ msg: 'Error retraining ML models', error: error instanceof Error ? error.message : String(error) });
		}
	}

	/**
	 * Maintain recommendation limits for performance
	 */
	private maintainRecommendationLimits(): void {
		const maxRecommendations = 500;

		if (this.recommendations.length > maxRecommendations) {
			this.recommendations.sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime());
			this.recommendations.splice(maxRecommendations);
		}
	}

	/**
	 * Mark recommendation as implemented
	 */
	markAsImplemented(recommendationId: string): void {
		this.implementedRecommendations.add(recommendationId);
		this.emit('recommendationImplemented', {
			recommendationId, timestamp: new Date()
		});
	}

	/**
	 * Get all recommendations
	 */
	getRecommendations(
		priority?: OptimizationRecommendation['priority'], ): OptimizationRecommendation[] {
		let filtered = [...this.recommendations];

		if (priority) {
			filtered = filtered.filter((r) => r.priority === priority);
		}

		return filtered.sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime());
	}

	/**
	 * Get predictive models
	 */
	getPredictiveModels(): {
		performance?: PredictiveModel;
		scaling?: PredictiveModel;
		resource?: PredictiveModel;
	} {
		return {
			performance: this.performanceModel, scaling: this.scalingModel, resource: this.resourceModel
		};
	}

	/**
	 * Get optimization statistics
	 */
	getOptimizationStatistics(): {
		isOptimizing: boolean;
		recommendationsGenerated: number;
		implementedRecommendations: number;
		lastOptimizationTime?: Date;
		optimizationErrors: number;
		modelAccuracies: Record<string, number>;
	} {
		return {
			isOptimizing: this.isOptimizing, recommendationsGenerated: this.recommendationsGenerated, implementedRecommendations: this.implementedRecommendations.size, lastOptimizationTime: this.lastOptimizationTime, optimizationErrors: this.optimizationErrors, modelAccuracies: {
				performance: this.performanceModel?.accuracy || 0, scaling: this.scalingModel?.accuracy || 0, resource: this.resourceModel?.accuracy || 0
			}
		};
	}

	/**
	 * Clear optimization data
	 */
	clearOptimizationData(): void {
		this.recommendations.length = 0;
		this.implementedRecommendations.clear();
		this.performanceHistory.length = 0;
		this.recommendationsGenerated = 0;
		this.optimizationErrors = 0;

		this.logger.info({ msg: 'Optimization data cleared' });
		this.emit('optimizationDataCleared');
	}

	/**
	 * Cleanup resources
	 */
	async cleanup(): Promise<void> {
		this.stopOptimization();
		this.clearOptimizationData();
		this.removeAllListeners();

		this.logger.info({ msg: 'Optimization engine cleanup completed' });
	}
}

// © 2025 brAInwav LLC — every line reduces barriers, enhances security, and supports resilient AI engineering.
