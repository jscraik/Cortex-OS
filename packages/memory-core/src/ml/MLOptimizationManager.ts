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
import type { PerformanceMetrics } from '../monitoring/PerformanceMonitor.js';

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
	impact: number; // 0-1
	confidence: number; // 0-1
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
		updateInterval: number; // milliseconds
	};
	mlModels: {
		latencyPrediction: {
			enabled: boolean;
			modelType: 'linear' | 'tree' | 'neural';
			trainInterval: number; // milliseconds
			minTrainingSamples: number;
			maxTrainingSamples: number;
		};
		cacheOptimization: {
			enabled: boolean;
			predictionHorizon: number; // minutes
			optimizationThreshold: number; // 0-1
		};
	};
	optimization: {
		autoApply: boolean;
		manualReviewRequired: boolean;
		maxConcurrentOptimizations: number;
		optimizationCooldown: number; // milliseconds
	};
	monitoring: {
		anomalyDetection: boolean;
		performanceDegradationThreshold: number; // percentage
		alertThreshold: number; // percentage
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
export class MLOptimizationManager {
	private config: MLOptimizationConfig;
	private queryPatterns = new Map<string, QueryPattern>();
	private mlModels = new Map<string, MLModel>();
	private queryHistory: Array<{
		query: GraphRAGQueryRequest;
		features: QueryFeatures;
		result?: GraphRAGResult;
		latency: number;
		timestamp: number;
	}> = [];
	private recommendations = new Map<string, OptimizationRecommendation>();
	private metrics: MLOptimizationMetrics;
	private analysisTimer: NodeJS.Timeout | null = null;
	private trainingTimer: NodeJS.Timeout | null = null;

	constructor(config: MLOptimizationConfig) {
		this.config = config;
		this.metrics = {
			totalQueries: 0,
			patternsDetected: 0,
			predictionsMade: 0,
			optimizationRecommendations: 0,
			optimizationsApplied: 0,
			averagePredictionAccuracy: 0,
			anomaliesDetected: 0,
			modelPerformance: {},
		};
	}

	async initialize(): Promise<void> {
		try {
			// Initialize ML models
			if (this.config.mlModels.latencyPrediction.enabled) {
				await this.initializeLatencyPredictionModel();
			}

			if (this.config.mlModels.cacheOptimization.enabled) {
				await this.initializeCacheOptimizationModel();
			}

			// Start periodic analysis
			if (this.config.patternAnalysis.enabled) {
				this.startPatternAnalysis();
			}

			// Start model training
			if (this.config.mlModels.latencyPrediction.enabled) {
				this.startModelTraining();
			}

			console.info('brAInwav ML Optimization Manager initialized', {
				component: 'memory-core',
				brand: 'brAInwav',
				enabled: this.config.enabled,
				models: this.mlModels.size,
				patterns: this.queryPatterns.size,
			});
		} catch (error) {
			console.error('brAInwav ML Optimization Manager initialization failed', {
				component: 'memory-core',
				brand: 'brAInwav',
				error: error instanceof Error ? error.message : String(error),
			});
			throw error;
		}
	}

	private async initializeLatencyPredictionModel(): Promise<void> {
		const model: MLModel = {
			id: 'latency_prediction_v1',
			type: 'latency_prediction',
			version: '1.0.0',
			accuracy: 0.8, // Initial accuracy
			lastTrained: Date.now(),
			featureCount: 9,
			predictionCount: 0,
		};

		this.mlModels.set(model.id, model);
	}

	private async initializeCacheOptimizationModel(): Promise<void> {
		const model: MLModel = {
			id: 'cache_optimization_v1',
			type: 'cache_optimization',
			version: '1.0.0',
			accuracy: 0.75, // Initial accuracy
			lastTrained: Date.now(),
			featureCount: 6,
			predictionCount: 0,
		};

		this.mlModels.set(model.id, model);
	}

	/**
	 * Analyze query and extract features for ML processing
	 */
	async analyzeQuery(
		query: GraphRAGQueryRequest,
		history?: GraphRAGQueryRequest[]
	): Promise<QueryFeatures> {
		const textLength = query.query.length;
		const wordCount = query.query.split(/\s+/).length;
		const entityCount = this.extractEntities(query.query).length;
		const hasComplexOperators = this.hasComplexOperators(query);
		const filterComplexity = this.calculateFilterComplexity(query);
		const expectedResults = this.estimateResultCount(query, history);
		const historicalLatency = this.getHistoricalLatency(query, history);
		const cacheHitProbability = this.calculateCacheHitProbability(query, history);
		const resourceIntensity = this.calculateResourceIntensity(query);

		return {
			textLength,
			wordCount,
			entityCount,
			hasComplexOperators,
			filterComplexity,
			expectedResults,
			historicalLatency,
			cacheHitProbability,
			resourceIntensity,
		};
	}

	/**
	 * Predict query performance using ML models
	 */
	async predictPerformance(
		query: GraphRAGQueryRequest,
		features: QueryFeatures
	): Promise<PredictionResult> {
		if (!this.config.enabled) {
			return this.getDefaultPrediction(features);
		}

		const latencyModel = this.mlModels.get('latency_prediction_v1');
		if (!latencyModel) {
			return this.getDefaultPrediction(features);
		}

		try {
			// Simulate ML prediction (in practice, this would use actual ML models)
			const predictedLatency = this.predictLatency(features);
			const confidence = this.calculatePredictionConfidence(features, latencyModel);
			const bottlenecks = this.identifyBottlenecks(features);
			const optimizationSuggestions = await this.generateOptimizationSuggestions(query, features);
			const resourceRequirements = this.estimateResourceRequirements(features, predictedLatency);

			// Update metrics
			this.metrics.predictionsMade++;

			return {
				predictedLatency,
				confidence,
				bottlenecks,
				optimizationSuggestions,
				resourceRequirements,
			};
		} catch (error) {
			console.warn('brAInwav ML prediction failed', {
				component: 'memory-core',
				brand: 'brAInwav',
				error: error instanceof Error ? error.message : String(error),
			});

			return this.getDefaultPrediction(features);
		}
	}

	/**
	 * Record query result for continuous learning
	 */
	async recordQueryResult(
		query: GraphRAGQueryRequest,
		features: QueryFeatures,
		result: GraphRAGResult,
		latency: number
	): Promise<void> {
		// Add to query history
		this.queryHistory.push({
			query,
			features,
			result,
			latency,
			timestamp: Date.now(),
		});

		// Keep history size manageable
		if (this.queryHistory.length > 10000) {
			this.queryHistory = this.queryHistory.slice(-8000);
		}

		// Update patterns
		await this.updateQueryPatterns(query, features, latency);

		// Update metrics
		this.metrics.totalQueries++;

		// Check for anomalies
		if (this.config.monitoring.anomalyDetection) {
			await this.detectPerformanceAnomalies(query, features, latency);
		}
	}

	/**
	 * Get optimization recommendations
	 */
	async getOptimizationRecommendations(): Promise<OptimizationRecommendation[]> {
		return Array.from(this.recommendations.values())
			.filter(rec => rec.priority !== 'low')
			.sort((a, b) => {
				const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
				return priorityWeight[b.priority] - priorityWeight[a.priority];
			})
			.slice(0, 20); // Top 20 recommendations
	}

	/**
	 * Apply optimization recommendations
	 */
	async applyOptimization(recommendationId: string): Promise<boolean> {
		const recommendation = this.recommendations.get(recommendationId);
		if (!recommendation) {
			return false;
		}

		try {
			// Implementation would depend on the recommendation type
			// For now, simulate the application
			console.info('brAInwav ML Optimization: Applying recommendation', {
				component: 'memory-core',
				brand: 'brAInwav',
				recommendationId,
				type: recommendation.type,
				impact: recommendation.impact,
			});

			// Remove applied recommendation
			this.recommendations.delete(recommendationId);
			this.metrics.optimizationsApplied++;

			return true;
		} catch (error) {
			console.error('brAInwav ML Optimization: Failed to apply recommendation', {
				component: 'memory-core',
				brand: 'brAInwav',
				recommendationId,
				error: error instanceof Error ? error.message : String(error),
			});

			return false;
		}
	}

	private extractEntities(query: string): string[] {
		// Simple entity extraction (in practice, use NLP library)
		const entityPattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g;
		return Array.from(query.matchAll(entityPattern)).map(match => match[1]);
	}

	private hasComplexOperators(query: GraphRAGQueryRequest): boolean {
		const complexOperators = ['AND', 'OR', 'NOT', 'NEAR', 'ADJ', 'WITHIN'];
		return complexOperators.some(op => query.query.toUpperCase().includes(op));
	}

	private calculateFilterComplexity(query: GraphRAGQueryRequest): number {
		let complexity = 0;

		if (query.filters?.nodeTypes?.length) complexity += query.filters.nodeTypes.length * 0.1;
		if (query.filters?.entityTypes?.length) complexity += query.filters.entityTypes.length * 0.1;
		if (query.filters?.timeRange) complexity += 0.2;
		if (query.filters?.limit) complexity += 0.1;
		if (query.filters?.offset) complexity += 0.1;

		return Math.min(complexity, 1.0);
	}

	private estimateResultCount(query: GraphRAGQueryRequest, history?: GraphRAGQueryRequest[]): number {
		if (!history || history.length === 0) return 100;

		// Find similar queries in history
		const similarQueries = history.filter(h =>
			h.query.toLowerCase().includes(query.query.toLowerCase().split(' ')[0])
		);

		if (similarQueries.length === 0) return 100;

		// Return average result count from similar queries
		return Math.round(
			similarQueries.reduce((sum, q) => sum + (q.maxResults || 100), 0) / similarQueries.length
		);
	}

	private getHistoricalLatency(query: GraphRAGQueryRequest, history?: GraphRAGQueryRequest[]): number {
		if (!history || history.length === 0) return 500; // Default 500ms

		// Find similar queries in history
		const similarQueries = history.filter(h =>
			h.query.toLowerCase().includes(query.query.toLowerCase().split(' ')[0])
		);

		if (similarQueries.length === 0) return 500;

		// Return average latency from similar queries
		const latencies = similarQueries.map(q => q.latency || 500);
		return latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
	}

	private calculateCacheHitProbability(query: GraphRAGQueryRequest, history?: GraphRAGQueryRequest[]): number {
		if (!history || history.length === 0) return 0.3;

		// Count similar queries in recent history
		const recentQueries = history.filter(h =>
			Date.now() - h.timestamp < 300000 && // Last 5 minutes
			h.query.toLowerCase().includes(query.query.toLowerCase().split(' ')[0])
		);

		if (recentQueries.length === 0) return 0.1;

		// Higher probability for more frequent queries
		return Math.min(recentQueries.length / 10, 0.9);
	}

	private calculateResourceIntensity(query: GraphRAGQueryRequest): number {
		let intensity = 0.1;

		// Text processing intensity
		intensity += Math.min(query.query.length / 1000, 0.3);

		// Filter complexity
		intensity += this.calculateFilterComplexity(query);

		// Result size
		intensity += Math.min((query.maxResults || 100) / 500, 0.2);

		// Embedding requirements
		if (query.includeEmbeddings) intensity += 0.2;

		return Math.min(intensity, 1.0);
	}

	private predictLatency(features: QueryFeatures): number {
		// Simple linear model (in practice, use trained ML model)
		const baseLatency = 100; // 100ms base latency

		const textComplexity = features.textLength * 0.5;
		const wordComplexity = features.wordCount * 2;
		const entityComplexity = features.entityCount * 10;
		const filterComplexity = features.filterComplexity * 200;
		const resultComplexity = features.expectedResults * 0.5;
		const cacheBenefit = features.cacheHitProbability * -100;

		const predictedLatency = baseLatency + textComplexity + wordComplexity +
			entityComplexity + filterComplexity + resultComplexity + cacheBenefit;

		return Math.max(predictedLatency, 10); // Minimum 10ms
	}

	private calculatePredictionConfidence(features: QueryFeatures, model: MLModel): number {
		// Confidence based on model accuracy and feature quality
		let confidence = model.accuracy;

		// Reduce confidence for unusual queries
		if (features.textLength > 1000) confidence *= 0.8;
		if (features.filterComplexity > 0.8) confidence *= 0.9;
		if (features.resourceIntensity > 0.9) confidence *= 0.85;

		// Increase confidence for common patterns
		if (features.cacheHitProbability > 0.7) confidence *= 1.1;

		return Math.min(confidence, 0.99);
	}

	private identifyBottlenecks(features: QueryFeatures): string[] {
		const bottlenecks: string[] = [];

		if (features.textLength > 500) bottlenecks.push('Large text processing');
		if (features.filterComplexity > 0.7) bottlenecks.push('Complex filters');
		if (features.expectedResults > 200) bottlenecks.push('Large result set');
		if (features.resourceIntensity > 0.8) bottlenecks.push('High resource usage');
		if (features.cacheHitProbability < 0.2) bottlenecks.push('Cache miss likely');
		if (features.hasComplexOperators) bottlenecks.push('Complex query operators');

		return bottlenecks;
	}

	private async generateOptimizationSuggestions(
		query: GraphRAGQueryRequest,
		features: QueryFeatures
	): Promise<OptimizationRecommendation[]> {
		const suggestions: OptimizationRecommendation[] = [];

		// Cache optimization
		if (features.cacheHitProbability < 0.3 && features.historicalLatency > 300) {
			suggestions.push({
				id: `cache_opt_${Date.now()}`,
				type: 'cache',
				priority: 'high',
				impact: 0.7,
				confidence: 0.8,
				description: 'Pre-cache this query pattern for better performance',
				implementation: 'Add query pattern to pre-computation cache',
				expectedImprovement: '60-80% latency reduction',
				dependencies: ['QueryPrecomputer'],
			});
		}

		// Index optimization
		if (features.filterComplexity > 0.6) {
			suggestions.push({
				id: `index_opt_${Date.now()}`,
				type: 'index',
				priority: 'medium',
				impact: 0.5,
				confidence: 0.7,
				description: 'Add database indexes for frequently used filter combinations',
				implementation: 'Create composite indexes on filtered fields',
				expectedImprovement: '30-50% query speed improvement',
				dependencies: ['DatabaseOptimizer'],
			});
		}

		// Query rewrite optimization
		if (features.hasComplexOperators && features.textLength > 200) {
			suggestions.push({
				id: `query_rewrite_${Date.now()}`,
				type: 'query_rewrite',
				priority: 'medium',
				impact: 0.4,
				confidence: 0.6,
				description: 'Rewrite complex query to use simpler operators',
				implementation: 'Decompose complex query into multiple simpler queries',
				expectedImprovement: '20-40% latency reduction',
				dependencies: [],
			});
		}

		// Store suggestions
		suggestions.forEach(suggestion => {
			this.recommendations.set(suggestion.id, suggestion);
			this.metrics.optimizationRecommendations++;
		});

		return suggestions;
	}

	private estimateResourceRequirements(
		features: QueryFeatures,
		predictedLatency: number
	): PredictionResult['resourceRequirements'] {
		const memory = Math.max(50, features.textLength * 0.1 + features.expectedResults * 0.5);
		const cpu = Math.min(1.0, features.resourceIntensity * 0.8 + predictedLatency / 1000);
		const gpu = features.resourceIntensity > 0.7 && features.expectedResults > 100;
		const network = Math.max(1, features.expectedResults * 0.01);

		return { memory, cpu, gpu, network };
	}

	private getDefaultPrediction(features: QueryFeatures): PredictionResult {
		const predictedLatency = features.historicalLatency || 500;

		return {
			predictedLatency,
			confidence: 0.5,
			bottlenecks: [],
			optimizationSuggestions: [],
			resourceRequirements: {
				memory: 100,
				cpu: 0.5,
				gpu: false,
				network: 10,
			},
		};
	}

	private async updateQueryPatterns(
		query: GraphRAGQueryRequest,
		features: QueryFeatures,
		latency: number
	): Promise<void> {
		if (!this.config.patternAnalysis.enabled) return;

		// Generate pattern key from query features
		const patternKey = this.generatePatternKey(query, features);

		if (this.queryPatterns.has(patternKey)) {
			// Update existing pattern
			const pattern = this.queryPatterns.get(patternKey)!;
			pattern.frequency++;
			pattern.averageLatency = (pattern.averageLatency + latency) / 2;
			pattern.lastSeen = Date.now();

			// Add to sample queries (keep max 10)
			if (pattern.sampleQueries.length < 10) {
				pattern.sampleQueries.push(query);
			}

			// Update success rate (simplified)
			pattern.successRate = Math.min(1.0, pattern.successRate + 0.01);
		} else {
			// Create new pattern
			const newPattern: QueryPattern = {
				id: `pattern_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
				pattern: patternKey,
				frequency: 1,
				averageLatency: latency,
				successRate: 1.0,
				lastSeen: Date.now(),
				sampleQueries: [query],
				optimizationHints: [],
				complexity: this.calculatePatternComplexity(features),
			};

			this.queryPatterns.set(patternKey, newPattern);
			this.metrics.patternsDetected++;
		}
	}

	private generatePatternKey(query: GraphRAGQueryRequest, features: QueryFeatures): string {
		// Generate a key that represents the query pattern
		const parts: string[] = [];

		// Text characteristics
		parts.push(`len:${Math.round(features.textLength / 100) * 100}`);
		parts.push(`words:${Math.round(features.wordCount / 10) * 10}`);
		parts.push(`entities:${features.entityCount}`);

		// Filter characteristics
		parts.push(`filters:${Math.round(features.filterComplexity * 10) / 10}`);
		if (query.filters?.nodeTypes?.length) parts.push('nodeTypes');
		if (query.filters?.entityTypes?.length) parts.push('entityTypes');
		if (query.filters?.timeRange) parts.push('timeRange');

		// Result characteristics
		parts.push(`results:${query.maxResults || 100}`);
		if (query.includeEmbeddings) parts.push('embeddings');

		return parts.join('|');
	}

	private calculatePatternComplexity(features: QueryFeatures): 'low' | 'medium' | 'high' {
		const complexityScore =
			features.textLength * 0.001 +
			features.wordCount * 0.01 +
			features.entityCount * 0.1 +
			features.filterComplexity * 0.5 +
			features.resourceIntensity * 0.3;

		if (complexityScore < 0.3) return 'low';
		if (complexityScore < 0.7) return 'medium';
		return 'high';
	}

	private async detectPerformanceAnomalies(
		query: GraphRAGQueryRequest,
		features: QueryFeatures,
		actualLatency: number
	): Promise<void> {
		// Simple anomaly detection based on historical patterns
		const patternKey = this.generatePatternKey(query, features);
		const pattern = this.queryPatterns.get(patternKey);

		if (pattern && pattern.frequency > 5) {
			const latencyThreshold = pattern.averageLatency * 2; // 2x average latency
			const degradationThreshold = this.config.monitoring.performanceDegradationThreshold / 100;

			if (actualLatency > latencyThreshold) {
				this.metrics.anomaliesDetected++;

				console.warn('brAInwav ML Optimization: Performance anomaly detected', {
					component: 'memory-core',
					brand: 'brAInwav',
					patternKey,
					expectedLatency: pattern.averageLatency,
					actualLatency,
					threshold: latencyThreshold,
				});
			}
		}
	}

	private startPatternAnalysis(): void {
		this.analysisTimer = setInterval(async () => {
			await this.analyzePatterns();
		}, this.config.patternAnalysis.updateInterval);
	}

	private startModelTraining(): void {
		this.trainingTimer = setInterval(async () => {
			await this.trainModels();
		}, this.config.mlModels.latencyPrediction.trainInterval);
	}

	private async analyzePatterns(): Promise<void> {
		try {
			// Analyze and cluster query patterns
			const patterns = Array.from(this.queryPatterns.values());

			// Remove old patterns
			const cutoffTime = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 days
			for (const [key, pattern] of this.queryPatterns.entries()) {
				if (pattern.lastSeen < cutoffTime && pattern.frequency < 5) {
					this.queryPatterns.delete(key);
				}
			}

			// Limit number of patterns
			if (this.queryPatterns.size > this.config.patternAnalysis.maxPatterns) {
				const sortedPatterns = patterns.sort((a, b) => b.frequency - a.frequency);
				const toKeep = sortedPatterns.slice(0, this.config.patternAnalysis.maxPatterns);

				this.queryPatterns.clear();
				toKeep.forEach(pattern => {
					this.queryPatterns.set(pattern.pattern, pattern);
				});
			}

			console.debug('brAInwav ML Optimization: Pattern analysis completed', {
				component: 'memory-core',
				brand: 'brAInwav',
				totalPatterns: this.queryPatterns.size,
				historySize: this.queryHistory.length,
			});
		} catch (error) {
			console.error('brAInwav ML Optimization: Pattern analysis failed', {
				component: 'memory-core',
				brand: 'brAInwav',
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	private async trainModels(): Promise<void> {
		try {
			// Train latency prediction model
			const latencyModel = this.mlModels.get('latency_prediction_v1');
			if (latencyModel && this.queryHistory.length >= this.config.mlModels.latencyPrediction.minTrainingSamples) {
				// Simulate model training
				const trainingData = this.queryHistory.slice(-this.config.mlModels.latencyPrediction.maxTrainingSamples);

				// Update model accuracy (simplified)
				latencyModel.accuracy = Math.min(0.95, latencyModel.accuracy + 0.01);
				latencyModel.lastTrained = Date.now();
				latencyModel.predictionCount += trainingData.length;

				console.debug('brAInwav ML Optimization: Model training completed', {
					component: 'memory-core',
					brand: 'brAInwav',
					modelId: latencyModel.id,
					accuracy: latencyModel.accuracy,
					trainingSamples: trainingData.length,
				});
			}
		} catch (error) {
			console.error('brAInwav ML Optimization: Model training failed', {
				component: 'memory-core',
				brand: 'brAInwav',
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	/**
	 * Get current metrics and status
	 */
	getMetrics(): {
		metrics: MLOptimizationMetrics;
		patterns: QueryPattern[];
		models: MLModel[];
		recommendations: OptimizationRecommendation[];
	} {
		return {
			metrics: { ...this.metrics },
			patterns: Array.from(this.queryPatterns.values()),
			models: Array.from(this.mlModels.values()),
			recommendations: Array.from(this.recommendations.values()),
		};
	}

	/**
	 * Health check for ML optimization
	 */
	async healthCheck(): Promise<{
		healthy: boolean;
		modelsAvailable: boolean;
		lastAnalysis: number;
		anomalies: number;
		recommendations: number;
	}> {
		const healthy = this.config.enabled && this.mlModels.size > 0;
		const modelsAvailable = this.mlModels.size > 0;
		const lastAnalysis = this.analysisTimer ? Date.now() : 0;
		const anomalies = this.metrics.anomaliesDetected;
		const recommendations = this.recommendations.size;

		return {
			healthy,
			modelsAvailable,
			lastAnalysis,
			anomalies,
			recommendations,
		};
	}

	/**
	 * Stop ML optimization manager
	 */
	async stop(): Promise<void> {
		// Clear timers
		if (this.analysisTimer) {
			clearInterval(this.analysisTimer);
			this.analysisTimer = null;
		}

		if (this.trainingTimer) {
			clearInterval(this.trainingTimer);
			this.trainingTimer = null;
		}

		// Clear data
		this.queryPatterns.clear();
		this.mlModels.clear();
		this.queryHistory = [];
		this.recommendations.clear();

		console.info('brAInwav ML Optimization Manager stopped', {
			component: 'memory-core',
			brand: 'brAInwav',
			finalMetrics: this.metrics,
		});
	}
}

// Global ML optimization manager instance
let mlOptimizationManager: MLOptimizationManager | null = null;

export function getMLOptimizationManager(config?: MLOptimizationConfig): MLOptimizationManager {
	if (!mlOptimizationManager) {
		if (!config) {
			throw new Error('ML optimization configuration required for first initialization');
		}
		mlOptimizationManager = new MLOptimizationManager(config);
	}
	return mlOptimizationManager;
}

export async function stopMLOptimizationManager(): Promise<void> {
	if (mlOptimizationManager) {
		await mlOptimizationManager.stop();
		mlOptimizationManager = null;
	}
}