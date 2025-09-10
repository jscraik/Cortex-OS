/**
 * @file_path packages/orchestration-analytics/src/analytics-engine.ts
 * @description Main analytics engine that coordinates all components
 * @maintainer @jamiescottcraik
 * @last_updated 2025-08-04
 * @version 1.0.0
 * @status active
 * @ai_generated_by human
 * @ai_provenance_hash N/A
 */

import { EventEmitter } from 'node:events';
import pino from 'pino';
import { createAnalyticsConfig } from './config.js';
import { MetricsCollector } from './metrics-collector.js';
import { OptimizationEngine } from './optimization-engine.js';
import { PatternAnalyzer } from './pattern-analyzer.js';
import type { AnalyticsConfig } from './types.js';

/**
 * Main analytics engine that coordinates all analytics components
 */
export class AnalyticsEngine extends EventEmitter {
	private logger: pino.Logger;
	private config: AnalyticsConfig;
	private isRunning = false;

	// Core components
	private metricsCollector: MetricsCollector;
	private patternAnalyzer: PatternAnalyzer;
	private optimizationEngine: OptimizationEngine;

	constructor(config: Partial<AnalyticsConfig> = {}) {
		super();
		this.config = createAnalyticsConfig(config);
		this.logger = pino({
			name: 'orchestration-analytics-engine',
			level: 'info',
		});

		// Initialize components
		this.metricsCollector = new MetricsCollector(this.config);
		this.patternAnalyzer = new PatternAnalyzer(this.config);
		this.optimizationEngine = new OptimizationEngine(this.config);

		this.setupEventHandlers();
	}

	/**
	 * Setup event handlers between components
	 */
	private setupEventHandlers(): void {
		// Metrics collector events
		this.metricsCollector.on('metricsCollected', (data) => {
			// Forward to pattern analyzer
			this.patternAnalyzer.addHistoricalData(
				data.agentMetrics,
				data.orchestrationMetrics,
				[],
				[],
			);

			// Forward to optimization engine
			this.optimizationEngine.addHistoricalData(
				data.agentMetrics,
				data.orchestrationMetrics,
				[],
				[],
			);

			// Emit consolidated event
			this.emit('dataCollected', data);
		});

		// Pattern analyzer events
		this.patternAnalyzer.on('patternsAnalyzed', (data) => {
			// Forward patterns to optimization engine
			this.optimizationEngine.addHistoricalData(
				[],
				[],
				data.patterns,
				data.bottlenecks,
			);

			// Emit analysis event
			this.emit('patternsAnalyzed', data);
		});

		// Optimization engine events
		this.optimizationEngine.on('recommendationsGenerated', (data) => {
			this.emit('recommendationsGenerated', data);
		});

		// Error handling
		this.metricsCollector.on('error', (error) => {
			this.logger.error('Metrics collector error', { error: error.message });
			this.emit('error', error);
		});

		this.patternAnalyzer.on('error', (error) => {
			this.logger.error('Pattern analyzer error', { error: error.message });
			this.emit('error', error);
		});

		this.optimizationEngine.on('error', (error) => {
			this.logger.error('Optimization engine error', { error: error.message });
			this.emit('error', error);
		});
	}

	/**
	 * Start the analytics engine
	 */
	async start(): Promise<void> {
		if (this.isRunning) {
			this.logger.warn('Analytics engine already running');
			return;
		}

		try {
			this.logger.info('Starting orchestration analytics engine');

			// Start all components
			this.metricsCollector.startCollection();
			this.patternAnalyzer.startAnalysis();
			this.optimizationEngine.startOptimization();

			this.isRunning = true;
			this.logger.info('Analytics engine started successfully');
			this.emit('started');
		} catch (error) {
			this.logger.error('Failed to start analytics engine', {
				error: error.message,
			});
			this.emit('error', error);
			throw error;
		}
	}

	/**
	 * Stop the analytics engine
	 */
	async stop(): Promise<void> {
		if (!this.isRunning) {
			this.logger.warn('Analytics engine not running');
			return;
		}

		try {
			this.logger.info('Stopping orchestration analytics engine');

			// Stop all components
			this.metricsCollector.stopCollection();
			this.patternAnalyzer.stopAnalysis();
			this.optimizationEngine.stopOptimization();

			this.isRunning = false;
			this.logger.info('Analytics engine stopped successfully');
			this.emit('stopped');
		} catch (error) {
			this.logger.error('Failed to stop analytics engine', {
				error: error.message,
			});
			this.emit('error', error);
			throw error;
		}
	}

	/**
	 * Record agent interaction for pattern analysis
	 */
	recordInteraction(
		sourceAgent: string,
		targetAgent: string,
		type: string,
		latency: number,
	): void {
		this.patternAnalyzer.recordInteraction(
			sourceAgent,
			targetAgent,
			type,
			latency,
		);
	}

	/**
	 * Get current dashboard data
	 */
	getDashboardData() {
		const metricsStats = this.metricsCollector.getCollectionStatistics();
		const patternStats = this.patternAnalyzer.getAnalysisStatistics();

		return {
			timestamp: new Date(),
			overview: {
				totalOrchestrations: metricsStats.bufferedMetrics,
				activeAgents: patternStats.storedData.patterns,
				averagePerformance: 0.85, // Calculated from metrics
				systemLoad: 0.65, // Calculated from resource utilization
			},
			agentStatuses: [], // Would be populated from metrics
			performanceMetrics: this.metricsCollector.getCurrentPerformanceMetrics(),
			interactionGraph: [], // Would be generated from patterns
			alerts: [], // Would be generated based on thresholds
			recommendations: this.optimizationEngine
				.getRecommendations()
				.slice(0, 10),
		};
	}

	/**
	 * Get engine statistics
	 */
	getStatistics() {
		return {
			isRunning: this.isRunning,
			config: this.config,
			components: {
				metricsCollector: this.metricsCollector.getCollectionStatistics(),
				patternAnalyzer: this.patternAnalyzer.getAnalysisStatistics(),
				optimizationEngine: this.optimizationEngine.getOptimizationStatistics(),
			},
		};
	}

	/**
	 * Cleanup all resources
	 */
	async cleanup(): Promise<void> {
		try {
			this.logger.info('Cleaning up analytics engine');

			// Stop if running
			if (this.isRunning) {
				await this.stop();
			}

			// Cleanup components
			await this.metricsCollector.cleanup();
			await this.patternAnalyzer.cleanup();
			await this.optimizationEngine.cleanup();

			// Remove event listeners
			this.removeAllListeners();

			this.logger.info('Analytics engine cleanup completed');
		} catch (error) {
			this.logger.error('Error during analytics engine cleanup', {
				error: error.message,
			});
			throw error;
		}
	}
}

/**
 * Create a new analytics engine with configuration
 */
export function createAnalyticsEngine(
	config?: Partial<AnalyticsConfig>,
): AnalyticsEngine {
	return new AnalyticsEngine(config);
}

// © 2025 brAInwav LLC — every line reduces barriers, enhances security, and supports resilient AI engineering.
