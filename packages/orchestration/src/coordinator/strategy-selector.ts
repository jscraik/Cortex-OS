/**
 * Strategy Selector Module for Cortex-OS
 * Implements intelligent strategy selection with learning and adaptation
 * Integrates with brAInwav-enhanced DSP patterns for optimal coordination
 */

import type { LongHorizonTask } from '../lib/long-horizon-planner.js';
import { OrchestrationStrategy } from '../types.js';
import type { PlanningContext } from '../utils/dsp.js';

export interface StrategySelectionCriteria {
	taskComplexity: number;
	taskPriority: number;
	agentCount: number;
	requiredCapabilities: string[];
	availableTime: number;
	resourceConstraints: {
		maxAgents: number;
		maxDuration: number;
	};
	context?: PlanningContext;
}

export interface StrategyScore {
	strategy: OrchestrationStrategy;
	score: number;
	confidence: number;
	reasoning: string;
	estimatedEfficiency: number;
	riskLevel: 'low' | 'medium' | 'high';
	recommendedFailureHandling?: 'strict' | 'resilient' | 'permissive';
}

export interface StrategyPerformanceData {
	strategy: OrchestrationStrategy;
	successRate: number;
	averageEfficiency: number;
	averageQuality: number;
	averageSpeed: number;
	totalExecutions: number;
	lastUsed: Date;
	complexityRange: [number, number];
	brainwavOrigin: boolean;
}

export interface StrategySelectionConfig {
	learningEnabled: boolean;
	adaptiveWeightingEnabled: boolean;
	nOArchitectureOptimized: boolean;
	performanceThreshold: number;
	maxHistorySize: number;
	brainwavTelemetryEnabled: boolean;
}

/**
 * Intelligent strategy selector with learning and adaptation capabilities
 * Optimized for nO Master Agent Loop architecture patterns
 */
export class StrategySelector {
	private readonly config: StrategySelectionConfig;
	private readonly performanceHistory: Map<OrchestrationStrategy, StrategyPerformanceData>;
	private readonly selectionHistory: Array<{
		criteria: StrategySelectionCriteria;
		selectedStrategy: OrchestrationStrategy;
		actualPerformance?: {
			efficiency: number;
			quality: number;
			speed: number;
		};
		timestamp: Date;
	}>;

	constructor(config: Partial<StrategySelectionConfig> = {}) {
		this.config = {
			learningEnabled: true,
			adaptiveWeightingEnabled: true,
			nOArchitectureOptimized: true,
			performanceThreshold: 0.7,
			maxHistorySize: 1000,
			brainwavTelemetryEnabled: true,
			...config,
		};

		this.performanceHistory = new Map();
		this.selectionHistory = [];

		this.initializeStrategyPerformance();

		console.log('brAInwav Strategy Selector: Initialized with nO architecture optimization');
	}

	/**
	 * Select optimal strategy based on criteria and historical performance
	 */
	selectStrategy(criteria: StrategySelectionCriteria): StrategyScore {
		console.log('brAInwav Strategy Selector: Analyzing criteria for optimal strategy selection');

		// Get candidate strategies based on criteria
		const candidates = this.getCandidateStrategies(criteria);

		// Score each candidate strategy
		const scores = candidates.map((strategy) => this.scoreStrategy(strategy, criteria));

		// Sort by score and confidence
		scores.sort((a, b) => {
			const scoreWeight = 0.7;
			const confidenceWeight = 0.3;
			const aWeighted = a.score * scoreWeight + a.confidence * confidenceWeight;
			const bWeighted = b.score * scoreWeight + b.confidence * confidenceWeight;
			return bWeighted - aWeighted;
		});

		const selectedScore = scores[0];

		// Record selection for learning
		this.recordSelection(criteria, selectedScore.strategy);

		if (selectedScore.recommendedFailureHandling && criteria.context?.preferences) {
			criteria.context.preferences.failureHandling = selectedScore.recommendedFailureHandling;
			criteria.context.preferences.notes.push(
				`brAInwav compliance override applied ${new Date().toISOString()}`,
			);
		}

		console.log(
			`brAInwav Strategy Selector: Selected ${selectedScore.strategy} with score ${selectedScore.score.toFixed(2)}`,
		);

		return selectedScore;
	}

	/**
	 * Update strategy performance data for learning
	 */
	updatePerformance(
		strategy: OrchestrationStrategy,
		task: LongHorizonTask,
		performance: { efficiency: number; quality: number; speed: number },
	): void {
		if (!this.config.learningEnabled) {
			return;
		}

		const performanceData = this.performanceHistory.get(strategy);
		if (!performanceData) {
			return;
		}

		const totalExecutions = performanceData.totalExecutions;

		// Update averages with exponential weighting for recent performance
		const alpha = 0.3; // Learning rate
		performanceData.averageEfficiency =
			alpha * performance.efficiency + (1 - alpha) * performanceData.averageEfficiency;
		performanceData.averageQuality =
			alpha * performance.quality + (1 - alpha) * performanceData.averageQuality;
		performanceData.averageSpeed =
			alpha * performance.speed + (1 - alpha) * performanceData.averageSpeed;

		// Update success rate
		const isSuccess = performance.quality > this.config.performanceThreshold;
		performanceData.successRate =
			alpha * (isSuccess ? 1 : 0) + (1 - alpha) * performanceData.successRate;

		// Update complexity range
		performanceData.complexityRange = [
			Math.min(performanceData.complexityRange[0], task.complexity),
			Math.max(performanceData.complexityRange[1], task.complexity),
		];

		performanceData.totalExecutions = totalExecutions + 1;
		performanceData.lastUsed = new Date();

		console.log(`brAInwav Strategy Selector: Updated performance data for ${strategy}`);
	}

	/**
	 * Get strategy performance insights
	 */
	getPerformanceInsights(): {
		bestPerformingStrategy: OrchestrationStrategy;
		worstPerformingStrategy: OrchestrationStrategy;
		totalSelections: number;
		learningEffectiveness: number;
		brainwavOptimized: boolean;
	} {
		let bestStrategy = OrchestrationStrategy.SEQUENTIAL;
		let worstStrategy = OrchestrationStrategy.SEQUENTIAL;
		let bestScore = 0;
		let worstScore = Infinity;

		for (const [strategy, data] of this.performanceHistory.entries()) {
			const compositeScore =
				data.successRate * 0.4 + data.averageEfficiency * 0.3 + data.averageQuality * 0.3;

			if (compositeScore > bestScore) {
				bestScore = compositeScore;
				bestStrategy = strategy;
			}

			if (compositeScore < worstScore) {
				worstScore = compositeScore;
				worstStrategy = strategy;
			}
		}

		// Calculate learning effectiveness
		const recentSelections = this.selectionHistory.slice(-50);
		const successfulSelections = recentSelections.filter(
			(selection) =>
				selection.actualPerformance &&
				selection.actualPerformance.quality > this.config.performanceThreshold,
		);
		const learningEffectiveness =
			recentSelections.length > 0 ? successfulSelections.length / recentSelections.length : 0;

		return {
			bestPerformingStrategy: bestStrategy,
			worstPerformingStrategy: worstStrategy,
			totalSelections: this.selectionHistory.length,
			learningEffectiveness,
			brainwavOptimized: this.config.nOArchitectureOptimized,
		};
	}

	/**
	 * Get candidate strategies based on selection criteria
	 */
	private getCandidateStrategies(criteria: StrategySelectionCriteria): OrchestrationStrategy[] {
		const candidates: OrchestrationStrategy[] = [];

		// Base strategy selection based on task characteristics
		if (criteria.taskComplexity <= 3 && criteria.requiredCapabilities.length <= 2) {
			candidates.push(OrchestrationStrategy.SEQUENTIAL);
		}

		if (criteria.agentCount >= 2 && criteria.taskComplexity <= 6) {
			candidates.push(OrchestrationStrategy.PARALLEL);
		}

		if (criteria.taskComplexity >= 5 && criteria.agentCount >= 3) {
			candidates.push(OrchestrationStrategy.ADAPTIVE);
		}

		if (criteria.agentCount >= 4 && criteria.taskComplexity >= 6) {
			candidates.push(OrchestrationStrategy.HIERARCHICAL);
		}

		// nO architecture optimizations
		if (this.config.nOArchitectureOptimized) {
			// Prefer non-hierarchical strategies for medium complexity
			if (criteria.taskComplexity >= 4 && criteria.taskComplexity <= 7) {
				candidates.push(OrchestrationStrategy.ADAPTIVE);
			}

			// Avoid reactive for high priority tasks
			if (criteria.taskPriority <= 6) {
				candidates.push(OrchestrationStrategy.REACTIVE);
			}
		}

		// Ensure at least one candidate
		if (candidates.length === 0) {
			candidates.push(OrchestrationStrategy.SEQUENTIAL);
		}

		return [...new Set(candidates)]; // Remove duplicates
	}

	/**
	 * Score a strategy based on criteria and historical performance
	 */
	private scoreStrategy(
		strategy: OrchestrationStrategy,
		criteria: StrategySelectionCriteria,
	): StrategyScore {
		let score = 0;
		let confidence = 0.5; // Base confidence
		const reasons: string[] = [];

		// Base scoring factors
		const complexityFit = this.scoreComplexityFit(strategy, criteria.taskComplexity);
		const resourceFit = this.scoreResourceFit(strategy, criteria);
		const priorityFit = this.scorePriorityFit(strategy, criteria.taskPriority);

		score += complexityFit * 0.4;
		score += resourceFit * 0.3;
		score += priorityFit * 0.3;

		reasons.push(`Complexity fit: ${complexityFit.toFixed(2)}`);
		reasons.push(`Resource fit: ${resourceFit.toFixed(2)}`);
		reasons.push(`Priority fit: ${priorityFit.toFixed(2)}`);

		// Historical performance influence
		if (this.config.learningEnabled) {
			const performanceData = this.performanceHistory.get(strategy);
			if (performanceData && performanceData.totalExecutions > 0) {
				const historicalScore =
					performanceData.successRate * 0.5 +
					performanceData.averageEfficiency * 0.3 +
					performanceData.averageQuality * 0.2;

				score = score * 0.6 + historicalScore * 0.4;
				confidence = Math.min(0.9, confidence + performanceData.totalExecutions * 0.01);

				reasons.push(`Historical performance: ${historicalScore.toFixed(2)}`);
			}
		}

		// nO architecture adjustments
		if (this.config.nOArchitectureOptimized) {
			const nOBonus = this.calculateNOBonus(strategy, criteria);
			score += nOBonus;
			if (nOBonus > 0) {
				reasons.push(`nO architecture bonus: ${nOBonus.toFixed(2)}`);
			}
		}

		let recommendedFailureHandling: 'strict' | 'resilient' | 'permissive' | undefined;
		const complianceImpact = this.evaluateComplianceInfluence(strategy, criteria);
		if (complianceImpact) {
			score = Math.max(0, score - complianceImpact.penalty);
			if (complianceImpact.reason) {
				reasons.push(complianceImpact.reason);
			}
			recommendedFailureHandling = complianceImpact.recommendedFailureHandling;
		}

		// Calculate risk level factoring compliance impact
		const riskLevel = this.calculateRiskLevel(strategy, criteria, complianceImpact?.riskOverride);

		return {
			strategy,
			score: Math.max(0, Math.min(1, score)),
			confidence,
			reasoning: reasons.join('; '),
			estimatedEfficiency: this.estimateEfficiency(strategy, criteria),
			riskLevel,
			recommendedFailureHandling,
		};
	}

	/**
	 * Score how well strategy fits task complexity
	 */
	private scoreComplexityFit(strategy: OrchestrationStrategy, complexity: number): number {
		const complexityMap: Record<
			OrchestrationStrategy,
			{ min: number; max: number; optimal: number }
		> = {
			[OrchestrationStrategy.SEQUENTIAL]: { min: 1, max: 5, optimal: 3 },
			[OrchestrationStrategy.PARALLEL]: { min: 3, max: 8, optimal: 6 },
			[OrchestrationStrategy.ADAPTIVE]: { min: 5, max: 10, optimal: 7 },
			[OrchestrationStrategy.HIERARCHICAL]: { min: 6, max: 10, optimal: 8 },
			[OrchestrationStrategy.REACTIVE]: { min: 1, max: 6, optimal: 4 },
		};

		const range = complexityMap[strategy];
		if (complexity < range.min || complexity > range.max) {
			return 0.2; // Poor fit but not impossible
		}

		// Gaussian-like scoring around optimal
		const distance = Math.abs(complexity - range.optimal);
		const maxDistance = Math.max(range.optimal - range.min, range.max - range.optimal);
		return Math.exp(-((distance / maxDistance) ** 2));
	}

	/**
	 * Score how well strategy fits available resources
	 */
	private scoreResourceFit(
		strategy: OrchestrationStrategy,
		criteria: StrategySelectionCriteria,
	): number {
		const agentRequirements: Record<OrchestrationStrategy, number> = {
			[OrchestrationStrategy.SEQUENTIAL]: 1,
			[OrchestrationStrategy.PARALLEL]: 2,
			[OrchestrationStrategy.ADAPTIVE]: 3,
			[OrchestrationStrategy.HIERARCHICAL]: 4,
			[OrchestrationStrategy.REACTIVE]: 1,
		};

		const requiredAgents = agentRequirements[strategy];
		if (criteria.agentCount < requiredAgents) {
			return 0.1; // Insufficient resources
		}

		// Score based on resource utilization efficiency
		const utilization = requiredAgents / criteria.agentCount;
		return utilization > 0.8 ? 1.0 : utilization > 0.5 ? 0.8 : 0.6;
	}

	/**
	 * Score how well strategy fits task priority
	 */
	private scorePriorityFit(strategy: OrchestrationStrategy, priority: number): number {
		// High priority tasks prefer faster, more reliable strategies
		if (priority >= 8) {
			const speedMap: Record<OrchestrationStrategy, number> = {
				[OrchestrationStrategy.PARALLEL]: 0.9,
				[OrchestrationStrategy.ADAPTIVE]: 0.8,
				[OrchestrationStrategy.SEQUENTIAL]: 0.6,
				[OrchestrationStrategy.HIERARCHICAL]: 0.5,
				[OrchestrationStrategy.REACTIVE]: 0.4,
			};
			return speedMap[strategy];
		}

		// Medium priority - balanced approach
		if (priority >= 5) {
			return 0.7; // Neutral scoring
		}

		// Low priority - efficiency matters more than speed
		const efficiencyMap: Record<OrchestrationStrategy, number> = {
			[OrchestrationStrategy.SEQUENTIAL]: 0.8,
			[OrchestrationStrategy.REACTIVE]: 0.7,
			[OrchestrationStrategy.PARALLEL]: 0.6,
			[OrchestrationStrategy.ADAPTIVE]: 0.5,
			[OrchestrationStrategy.HIERARCHICAL]: 0.4,
		};
		return efficiencyMap[strategy];
	}

	/**
	 * Calculate nO architecture bonus
	 */
	private calculateNOBonus(
		strategy: OrchestrationStrategy,
		criteria: StrategySelectionCriteria,
	): number {
		// nO patterns favor distributed coordination
		if (strategy === OrchestrationStrategy.ADAPTIVE && criteria.agentCount >= 3) {
			return 0.1;
		}

		// nO patterns discourage single master hierarchies for medium complexity
		if (
			strategy === OrchestrationStrategy.HIERARCHICAL &&
			criteria.taskComplexity <= 7 &&
			criteria.agentCount <= 5
		) {
			return -0.1;
		}

		return 0;
	}

	/**
	 * Calculate risk level for strategy selection
	 */
	private calculateRiskLevel(
		strategy: OrchestrationStrategy,
		criteria: StrategySelectionCriteria,
		complianceOverride?: 'medium' | 'high',
	): 'low' | 'medium' | 'high' {
		const performanceData = this.performanceHistory.get(strategy);
		if (complianceOverride) {
			return complianceOverride;
		}

		// High risk if low success rate or insufficient data
		if (
			!performanceData ||
			performanceData.totalExecutions < 5 ||
			performanceData.successRate < 0.6
		) {
			return 'high';
		}

		// Medium risk for complex tasks with untested strategies
		if (criteria.taskComplexity >= 8 && performanceData.totalExecutions < 20) {
			return 'medium';
		}

		return 'low';
	}

	private evaluateComplianceInfluence(
		strategy: OrchestrationStrategy,
		criteria: StrategySelectionCriteria,
	): {
		penalty: number;
		reason?: string;
		recommendedFailureHandling?: 'strict' | 'resilient';
		riskOverride?: 'medium' | 'high';
	} | null {
		const compliance = criteria.context?.compliance;
		if (!compliance) {
			return null;
		}

		const violationCount = compliance.outstandingViolations.length;
		const highestSeverity = violationCount
			? compliance.outstandingViolations.reduce<'low' | 'medium' | 'high' | 'critical'>(
					(acc, violation) =>
						this.compareSeverity(violation.severity, acc) > 0 ? violation.severity : acc,
					'low',
				)
			: 'low';
		const escalatedRisk = compliance.riskScore >= 0.7 || highestSeverity === 'critical';
		const moderateRisk = compliance.riskScore >= 0.4 || violationCount > 0;

		let penalty = 0;
		let recommendedFailureHandling: 'strict' | 'resilient' | undefined;
		let riskOverride: 'medium' | 'high' | undefined;

		if (escalatedRisk) {
			riskOverride = 'high';
			penalty = this.getCompliancePenalty(strategy, 0.25, 0.15);
			recommendedFailureHandling = 'strict';
		} else if (moderateRisk) {
			riskOverride = 'medium';
			penalty = this.getCompliancePenalty(strategy, 0.15, 0.1);
			recommendedFailureHandling = 'resilient';
		}

		if (penalty === 0) {
			return null;
		}

		const reason = `Compliance risk penalty ${penalty.toFixed(2)} (risk=${compliance.riskScore.toFixed(
			2,
		)}, violations=${violationCount})`;

		return {
			penalty,
			reason,
			recommendedFailureHandling,
			riskOverride,
		};
	}

	private getCompliancePenalty(
		strategy: OrchestrationStrategy,
		parallelPenalty: number,
		hierarchicalPenalty: number,
	): number {
		if (
			strategy === OrchestrationStrategy.PARALLEL ||
			strategy === OrchestrationStrategy.ADAPTIVE
		) {
			return parallelPenalty;
		}
		if (strategy === OrchestrationStrategy.HIERARCHICAL) {
			return hierarchicalPenalty;
		}
		return 0;
	}

	private compareSeverity(current: string, reference: string): number {
		const order: Record<string, number> = {
			low: 1,
			medium: 2,
			high: 3,
			critical: 4,
		};
		return (order[current] ?? 0) - (order[reference] ?? 0);
	}

	/**
	 * Estimate efficiency for strategy
	 */
	private estimateEfficiency(
		strategy: OrchestrationStrategy,
		_criteria: StrategySelectionCriteria,
	): number {
		const performanceData = this.performanceHistory.get(strategy);
		if (performanceData && performanceData.totalExecutions > 0) {
			return performanceData.averageEfficiency;
		}

		// Default estimates
		const defaultEfficiency: Record<OrchestrationStrategy, number> = {
			[OrchestrationStrategy.SEQUENTIAL]: 0.7,
			[OrchestrationStrategy.PARALLEL]: 0.8,
			[OrchestrationStrategy.ADAPTIVE]: 0.75,
			[OrchestrationStrategy.HIERARCHICAL]: 0.65,
			[OrchestrationStrategy.REACTIVE]: 0.6,
		};

		return defaultEfficiency[strategy];
	}

	/**
	 * Record strategy selection for learning
	 */
	private recordSelection(
		criteria: StrategySelectionCriteria,
		strategy: OrchestrationStrategy,
	): void {
		this.selectionHistory.push({
			criteria,
			selectedStrategy: strategy,
			timestamp: new Date(),
		});

		// Trim history if too large
		if (this.selectionHistory.length > this.config.maxHistorySize) {
			this.selectionHistory.shift();
		}
	}

	/**
	 * Initialize default strategy performance data
	 */
	private initializeStrategyPerformance(): void {
		const strategies = Object.values(OrchestrationStrategy);

		for (const strategy of strategies) {
			this.performanceHistory.set(strategy, {
				strategy,
				successRate: 0.7, // Conservative default
				averageEfficiency: 0.7,
				averageQuality: 0.7,
				averageSpeed: 0.7,
				totalExecutions: 0,
				lastUsed: new Date(),
				complexityRange: [1, 10],
				brainwavOrigin: true,
			});
		}

		console.log('brAInwav Strategy Selector: Initialized performance tracking for all strategies');
	}
}

/**
 * Create strategy selector with brAInwav-optimized defaults
 */
export function createStrategySelector(
	config?: Partial<StrategySelectionConfig>,
): StrategySelector {
	const defaultConfig: Partial<StrategySelectionConfig> = {
		learningEnabled: true,
		adaptiveWeightingEnabled: true,
		nOArchitectureOptimized: true,
		performanceThreshold: 0.7,
		maxHistorySize: 1000,
		brainwavTelemetryEnabled: true,
	};

	return new StrategySelector({ ...defaultConfig, ...config });
}
