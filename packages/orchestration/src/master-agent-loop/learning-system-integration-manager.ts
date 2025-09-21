/**
 * @fileoverview Learning System Integration Manager for nO Master Agent Loop
 * @module LearningSystemIntegrationManager
 * @description Provides cross-component learning, knowledge sharing, performance optimization, and adaptive behavior
 * @author brAInwav Development Team
 * @version 2.4.0
 * @since 2024-12-09
 */

import { EventEmitter } from 'node:events';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import { z } from 'zod';

/**
 * Learning models for different types of learning
 */
export const LearningModelSchema = z.object({
	modelId: z.string().min(1, 'Model ID is required'),
	modelType: z.enum(['performance', 'strategy', 'resource', 'behavior']),
	accuracy: z.number().min(0).max(1),
	lastUpdated: z.date(),
	trainingData: z.array(z.record(z.unknown())),
	hyperparameters: z.record(z.unknown()),
	version: z.string().min(1),
});

export type LearningModel = z.infer<typeof LearningModelSchema>;

/**
 * Cross-component learning data
 */
export const CrossComponentLearningSchema = z.object({
	sourceComponent: z.string().min(1),
	targetComponent: z.string().min(1),
	knowledgeType: z.enum([
		'strategy',
		'performance-pattern',
		'resource-usage',
		'failure-pattern',
		'optimization',
	]),
	knowledge: z.record(z.unknown()),
	transferredAt: z.date(),
	confidence: z.number().min(0).max(1),
	applicability: z.number().min(0).max(1),
});

export type CrossComponentLearning = z.infer<typeof CrossComponentLearningSchema>;

/**
 * Performance insights and analytics
 */
export const PerformanceInsightSchema = z.object({
	insightId: z.string().min(1),
	category: z.enum(['bottleneck', 'optimization', 'trend', 'anomaly', 'prediction']),
	component: z.string().min(1),
	description: z.string().min(1),
	impact: z.enum(['low', 'medium', 'high', 'critical']),
	confidence: z.number().min(0).max(1),
	actionable: z.boolean(),
	recommendedActions: z.array(z.string()),
	metrics: z.record(z.number()),
	generatedAt: z.date(),
});

export type PerformanceInsight = z.infer<typeof PerformanceInsightSchema>;

/**
 * Adaptive behavior configuration
 */
export const AdaptiveBehaviorSchema = z.object({
	behaviorId: z.string().min(1),
	component: z.string().min(1),
	adaptationType: z.enum(['threshold', 'strategy', 'resource-allocation', 'scheduling']),
	currentValue: z.unknown(),
	targetValue: z.unknown(),
	adaptationRate: z.number().min(0).max(1),
	conditions: z.array(z.string()),
	lastAdaptation: z.date(),
	adaptationHistory: z.array(
		z.object({
			timestamp: z.date(),
			oldValue: z.unknown(),
			newValue: z.unknown(),
			trigger: z.string(),
		}),
	),
});

export type AdaptiveBehavior = z.infer<typeof AdaptiveBehaviorSchema>;

/**
 * Learning system configuration
 */
export const LearningSystemConfigSchema = z.object({
	learningEnabled: z.boolean().default(true),
	learningRate: z.number().min(0).max(1).default(0.1),
	knowledgeRetentionDays: z.number().min(1).default(30),
	minimumDataPoints: z.number().min(1).default(10),
	confidenceThreshold: z.number().min(0).max(1).default(0.7),
	adaptationEnabled: z.boolean().default(true),
	adaptationInterval: z.number().min(1000).default(300000), // 5 minutes
	insightGenerationEnabled: z.boolean().default(true),
	insightGenerationInterval: z.number().min(60000).default(900000), // 15 minutes
	crossComponentLearningEnabled: z.boolean().default(true),
	maxKnowledgeTransfers: z.number().min(1).default(100),
	performanceAnalysisEnabled: z.boolean().default(true),
});

export type LearningSystemConfig = z.infer<typeof LearningSystemConfigSchema>;

/**
 * Learning System Integration Manager for nO Master Agent Loop
 * Provides sophisticated cross-component learning, knowledge sharing, and adaptive behavior
 */
export class LearningSystemIntegrationManager extends EventEmitter {
	private readonly tracer = trace.getTracer('nO-learning-system-integration');
	private readonly config: LearningSystemConfig;
	private readonly learningModels = new Map<string, LearningModel>();
	private readonly knowledgeBase = new Map<string, CrossComponentLearning[]>();
	private readonly performanceInsights = new Map<string, PerformanceInsight[]>();
	private readonly adaptiveBehaviors = new Map<string, AdaptiveBehavior>();
	private readonly learningHistory: Array<{
		timestamp: Date;
		component: string;
		action: string;
		data: Record<string, unknown>;
	}> = [];

	private adaptationTimer: NodeJS.Timeout | null = null;
	private insightTimer: NodeJS.Timeout | null = null;
	private isShuttingDown = false;

	constructor(config: Partial<LearningSystemConfig> = {}) {
		super();
		this.config = LearningSystemConfigSchema.parse(config);
		this.startPeriodicTasks();
	}

	/**
	 * Learn from execution data and update models
	 */
	async learnFromExecution(
		component: string,
		executionData: {
			strategy: string;
			performance: Record<string, number>;
			outcome: 'success' | 'failure' | 'partial';
			duration: number;
		},
	): Promise<string> {
		return this.tracer.startActiveSpan('learning-system.learn-from-execution', async (span) => {
			try {
				if (!this.config.learningEnabled) {
					return 'learning-disabled';
				}

				const learningId = `learning-${component}-${Date.now()}`;

				// Update learning models
				await this.updateLearningModel(component, 'performance', executionData);

				// Record learning history
				this.learningHistory.push({
					timestamp: new Date(),
					component,
					action: 'learn-from-execution',
					data: executionData,
				});

				// Generate insights if enabled
				if (this.config.insightGenerationEnabled) {
					await this.generatePerformanceInsights(component, executionData);
				}

				// Emit learning event
				this.emit('learning-updated', {
					component,
					learningId,
					executionData,
					timestamp: new Date(),
				});

				span.setStatus({ code: SpanStatusCode.OK });
				span.setAttributes({
					'learning.component': component,
					'learning.outcome': executionData.outcome,
					'learning.duration': executionData.duration,
				});

				return learningId;
			} catch (error) {
				span.recordException(error as Error);
				span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
				throw error;
			} finally {
				span.end();
			}
		});
	}

	/**
	 * Share knowledge between components
	 */
	async shareKnowledge(
		sourceComponent: string,
		targetComponent: string,
		knowledgeType: CrossComponentLearning['knowledgeType'],
	): Promise<string> {
		return this.tracer.startActiveSpan('learning-system.share-knowledge', async (span) => {
			try {
				if (!this.config.crossComponentLearningEnabled) {
					return 'knowledge-sharing-disabled';
				}

				const transferId = `transfer-${sourceComponent}-${targetComponent}-${Date.now()}`;

				// Extract knowledge from source component
				const sourceKnowledge = await this.extractKnowledge(sourceComponent, knowledgeType);

				// Adapt knowledge for target component
				const adaptedKnowledge = await this.adaptKnowledge(
					sourceKnowledge,
					targetComponent,
					knowledgeType,
				);

				// Transfer knowledge
				const transfer: CrossComponentLearning = {
					sourceComponent,
					targetComponent,
					knowledgeType,
					knowledge: adaptedKnowledge,
					transferredAt: new Date(),
					confidence: this.calculateTransferConfidence(sourceKnowledge, adaptedKnowledge),
					applicability: this.calculateApplicability(
						sourceComponent,
						targetComponent,
						knowledgeType,
					),
				};

				// Store knowledge transfer
				if (!this.knowledgeBase.has(targetComponent)) {
					this.knowledgeBase.set(targetComponent, []);
				}
				this.knowledgeBase.get(targetComponent)?.push(transfer);

				// Limit knowledge base size
				this.limitKnowledgeBase(targetComponent);

				// Emit knowledge sharing event
				this.emit('knowledge-shared', {
					transferId,
					transfer,
					timestamp: new Date(),
				});

				span.setStatus({ code: SpanStatusCode.OK });
				span.setAttributes({
					'knowledge.source': sourceComponent,
					'knowledge.target': targetComponent,
					'knowledge.type': knowledgeType,
					'knowledge.confidence': transfer.confidence,
				});

				return transferId;
			} catch (error) {
				span.recordException(error as Error);
				span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
				throw error;
			} finally {
				span.end();
			}
		});
	}

	/**
	 * Generate performance insights
	 */
	async generateInsights(component?: string): Promise<PerformanceInsight[]> {
		return this.tracer.startActiveSpan('learning-system.generate-insights', async (span) => {
			try {
				if (!this.config.insightGenerationEnabled) {
					return [];
				}

				const insights: PerformanceInsight[] = [];
				const components = component
					? [component]
					: Array.from(
							new Set(Array.from(this.learningModels.keys()).map((key) => key.split('-')[0])),
						);

				for (const comp of components) {
					const componentInsights = await this.generateComponentInsights(comp);
					insights.push(...componentInsights);
				}

				// Store insights
				if (component) {
					this.performanceInsights.set(component, insights);
				} else {
					for (const insight of insights) {
						if (!this.performanceInsights.has(insight.component)) {
							this.performanceInsights.set(insight.component, []);
						}
						this.performanceInsights.get(insight.component)?.push(insight);
					}
				}

				// Emit insights event
				this.emit('insights-generated', {
					component,
					insights,
					timestamp: new Date(),
				});

				span.setStatus({ code: SpanStatusCode.OK });
				span.setAttributes({
					'insights.component': component || 'all',
					'insights.count': insights.length,
				});

				return insights;
			} catch (error) {
				span.recordException(error as Error);
				span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
				throw error;
			} finally {
				span.end();
			}
		});
	}

	/**
	 * Adapt behavior based on learning
	 */
	async adaptBehavior(
		component: string,
		behaviorType: AdaptiveBehavior['adaptationType'],
		targetValue: unknown,
		conditions: string[] = [],
	): Promise<string> {
		return this.tracer.startActiveSpan('learning-system.adapt-behavior', async (span) => {
			try {
				if (!this.config.adaptationEnabled) {
					return 'adaptation-disabled';
				}

				const behaviorId = `behavior-${component}-${behaviorType}-${Date.now()}`;
				const currentBehavior = this.adaptiveBehaviors.get(`${component}-${behaviorType}`);

				const adaptiveBehavior: AdaptiveBehavior = {
					behaviorId,
					component,
					adaptationType: behaviorType,
					currentValue: targetValue,
					targetValue,
					adaptationRate: this.config.learningRate,
					conditions,
					lastAdaptation: new Date(),
					adaptationHistory: [
						...(currentBehavior?.adaptationHistory || []),
						{
							timestamp: new Date(),
							oldValue: currentBehavior?.currentValue || null,
							newValue: targetValue,
							trigger: conditions.join(', ') || 'manual',
						},
					],
				};

				// Store adaptive behavior
				this.adaptiveBehaviors.set(`${component}-${behaviorType}`, adaptiveBehavior);

				// Emit adaptation event
				this.emit('behavior-adapted', {
					behaviorId,
					component,
					behaviorType,
					adaptiveBehavior,
					timestamp: new Date(),
				});

				span.setStatus({ code: SpanStatusCode.OK });
				span.setAttributes({
					'adaptation.component': component,
					'adaptation.type': behaviorType,
					'adaptation.conditions': conditions.length,
				});

				return behaviorId;
			} catch (error) {
				span.recordException(error as Error);
				span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
				throw error;
			} finally {
				span.end();
			}
		});
	}

	/**
	 * Get learning status and metrics
	 */
	getLearningStatus(): {
		modelsCount: number;
		knowledgeBaseSize: number;
		insightsCount: number;
		adaptiveBehaviorsCount: number;
		learningHistorySize: number;
		configuration: LearningSystemConfig;
	} {
		return {
			modelsCount: this.learningModels.size,
			knowledgeBaseSize: Array.from(this.knowledgeBase.values()).reduce(
				(sum, arr) => sum + arr.length,
				0,
			),
			insightsCount: Array.from(this.performanceInsights.values()).reduce(
				(sum, arr) => sum + arr.length,
				0,
			),
			adaptiveBehaviorsCount: this.adaptiveBehaviors.size,
			learningHistorySize: this.learningHistory.length,
			configuration: this.config,
		};
	}

	/**
	 * Get component knowledge
	 */
	getComponentKnowledge(component: string): CrossComponentLearning[] {
		return this.knowledgeBase.get(component) || [];
	}

	/**
	 * Get component insights
	 */
	getComponentInsights(component: string): PerformanceInsight[] {
		return this.performanceInsights.get(component) || [];
	}

	/**
	 * Get adaptive behaviors
	 */
	getAdaptiveBehaviors(component?: string): AdaptiveBehavior[] {
		if (component) {
			return Array.from(this.adaptiveBehaviors.entries())
				.filter(([key]) => key.startsWith(`${component}-`))
				.map(([, behavior]) => behavior);
		}
		return Array.from(this.adaptiveBehaviors.values());
	}

	/**
	 * Private method to update learning model
	 */
	private async updateLearningModel(
		component: string,
		modelType: LearningModel['modelType'],
		data: Record<string, unknown>,
	): Promise<void> {
		const modelKey = `${component}-${modelType}`;
		const existingModel = this.learningModels.get(modelKey);

		const updatedModel: LearningModel = {
			modelId: modelKey,
			modelType,
			accuracy: this.calculateModelAccuracy(existingModel, data),
			lastUpdated: new Date(),
			trainingData: [
				...(existingModel?.trainingData.slice(-this.config.minimumDataPoints + 1) || []),
				data,
			],
			hyperparameters: this.updateHyperparameters(existingModel?.hyperparameters || {}),
			version: this.incrementVersion(existingModel?.version || '1.0.0'),
		};

		this.learningModels.set(modelKey, updatedModel);
	}

	/**
	 * Private method to extract knowledge from component
	 */
	private async extractKnowledge(
		component: string,
		knowledgeType: CrossComponentLearning['knowledgeType'],
	): Promise<Record<string, unknown>> {
		const model = this.learningModels.get(`${component}-performance`);
		const insights = this.performanceInsights.get(component) || [];
		const behaviors = this.getAdaptiveBehaviors(component);

		return {
			modelData: model?.trainingData || [],
			insights: insights.filter((i) => i.category === 'optimization'),
			behaviors: behaviors.filter((b) => b.adaptationType === 'strategy'),
			patterns: this.extractPatterns(knowledgeType),
			metadata: {
				component,
				knowledgeType,
				extractedAt: new Date(),
				dataPoints: model?.trainingData.length || 0,
			},
		};
	}

	/**
	 * Private method to adapt knowledge for target component
	 */
	private async adaptKnowledge(
		sourceKnowledge: Record<string, unknown>,
		targetComponent: string,
		knowledgeType: CrossComponentLearning['knowledgeType'],
	): Promise<Record<string, unknown>> {
		// Simple adaptation logic - can be enhanced with ML models
		return {
			...sourceKnowledge,
			adaptedFor: targetComponent,
			adaptationType: knowledgeType,
			adaptationScore: Math.random() * 0.3 + 0.7, // Mock adaptation score
			adaptedAt: new Date(),
		};
	}

	/**
	 * Private method to calculate transfer confidence
	 */
	private calculateTransferConfidence(
		_sourceKnowledge: Record<string, unknown>,
		_adaptedKnowledge: Record<string, unknown>,
	): number {
		// Mock confidence calculation - can be enhanced with similarity metrics
		return Math.min(0.95, Math.random() * 0.3 + 0.65);
	}

	/**
	 * Private method to calculate applicability
	 */
	private calculateApplicability(
		sourceComponent: string,
		targetComponent: string,
		_knowledgeType: CrossComponentLearning['knowledgeType'],
	): number {
		// Mock applicability calculation - can be enhanced with component similarity
		const similarity = sourceComponent === targetComponent ? 1.0 : Math.random() * 0.5 + 0.4;
		return Math.min(0.95, similarity * (Math.random() * 0.2 + 0.8));
	}

	/**
	 * Private method to generate performance insights for execution
	 */
	private async generatePerformanceInsights(
		component: string,
		executionData: Record<string, unknown>,
	): Promise<void> {
		const insight: PerformanceInsight = {
			insightId: `insight-${component}-${Date.now()}`,
			category: 'trend',
			component,
			description: `Performance analysis for ${component}`,
			impact: 'medium',
			confidence: Math.random() * 0.3 + 0.7,
			actionable: true,
			recommendedActions: ['Monitor performance trends', 'Consider optimization'],
			metrics: (executionData.performance as Record<string, number>) || {},
			generatedAt: new Date(),
		};

		const list = this.performanceInsights.get(component) ?? [];
		list.push(insight);
		this.performanceInsights.set(component, list);
	}

	/**
	 * Private method to generate component insights
	 */
	private async generateComponentInsights(componentName: string): Promise<PerformanceInsight[]> {
		const insights: PerformanceInsight[] = [];
		const model = this.learningModels.get(`${componentName}-performance`);

		if (model && model.trainingData.length >= this.config.minimumDataPoints) {
			insights.push({
				insightId: `insight-${componentName}-performance-${Date.now()}`,
				category: 'optimization',
				component: componentName,
				description: `Performance optimization opportunity detected for ${componentName}`,
				impact: 'high',
				confidence: model.accuracy,
				actionable: true,
				recommendedActions: ['Review resource allocation', 'Optimize critical paths'],
				metrics: { accuracy: model.accuracy, dataPoints: model.trainingData.length },
				generatedAt: new Date(),
			});
		}

		return insights;
	}

	/**
	 * Private method to extract patterns
	 */
	private extractPatterns(
		knowledgeType: CrossComponentLearning['knowledgeType'],
	): Record<string, unknown> {
		// Mock pattern extraction - can be enhanced with ML algorithms
		return {
			patternType: knowledgeType,
			frequency: Math.random() * 100,
			strength: Math.random(),
			extractedAt: new Date(),
		};
	}

	/**
	 * Private method to limit knowledge base size
	 */
	private limitKnowledgeBase(component: string): void {
		const knowledge = this.knowledgeBase.get(component);
		if (knowledge && knowledge.length > this.config.maxKnowledgeTransfers) {
			knowledge.splice(0, knowledge.length - this.config.maxKnowledgeTransfers);
		}
	}

	/**
	 * Private method to calculate model accuracy
	 */
	private calculateModelAccuracy(
		existingModel: LearningModel | undefined,
		_newData: Record<string, unknown>,
	): number {
		// Mock accuracy calculation - can be enhanced with actual ML metrics
		const baseAccuracy = existingModel?.accuracy || 0.5;
		const improvement = Math.random() * 0.1 - 0.05; // Random improvement/degradation
		return Math.max(0.1, Math.min(0.99, baseAccuracy + improvement));
	}

	/**
	 * Private method to update hyperparameters
	 */
	private updateHyperparameters(existing: Record<string, unknown>): Record<string, unknown> {
		return {
			...existing,
			learningRate: this.config.learningRate,
			updatedAt: new Date(),
		};
	}

	/**
	 * Private method to increment version
	 */
	private incrementVersion(currentVersion: string): string {
		const parts = currentVersion.split('.').map(Number);
		parts[2] = (parts[2] || 0) + 1;
		return parts.join('.');
	}

	/**
	 * Start periodic tasks
	 */
	private startPeriodicTasks(): void {
		if (this.config.adaptationEnabled) {
			this.adaptationTimer = setInterval(() => {
				this.performPeriodicAdaptation();
			}, this.config.adaptationInterval);
		}

		if (this.config.insightGenerationEnabled) {
			this.insightTimer = setInterval(() => {
				this.generateInsights();
			}, this.config.insightGenerationInterval);
		}
	}

	/**
	 * Perform periodic adaptation
	 */
	private async performPeriodicAdaptation(): Promise<void> {
		if (this.isShuttingDown) return;

		try {
			// Implement periodic adaptation logic
			for (const [component] of this.learningModels) {
				const componentName = component.split('-')[0];
				// Simple adaptation based on performance trends
				await this.adaptBehavior(componentName, 'threshold', 'auto-adjusted', [
					'periodic-optimization',
				]);
			}
		} catch (error) {
			this.emit('error', error);
		}
	}

	/**
	 * Graceful shutdown
	 */
	async shutdown(): Promise<void> {
		this.isShuttingDown = true;

		if (this.adaptationTimer) {
			clearInterval(this.adaptationTimer);
			this.adaptationTimer = null;
		}

		if (this.insightTimer) {
			clearInterval(this.insightTimer);
			this.insightTimer = null;
		}

		this.emit('learning-system-shutdown', {
			timestamp: new Date(),
			status: 'graceful',
		});

		this.removeAllListeners();
	}
}
