export type TaskProfile = {
	description: string;
	complexity: number; // 0..1
	canParallelize: boolean;
	estimatedBranches: number; // rough count of independent branches
	dataSize: number; // arbitrary unit
};

export type Strategy = 'parallel-coordinated' | 'sequential-safe' | 'hybrid';

// Enhanced types for nO architecture
export interface MultiObjectiveResult {
	score: number;
	recommendedStrategy: Strategy;
	tradeoffs: string[];
	notes: string[];
}

export interface PerformancePrediction {
	strategies: StrategyPerformance[];
}

export interface StrategyPerformance {
	name: Strategy;
	predictedDurationMs: number;
	successProbability: number;
	resourceEstimate: {
		concurrentAgents: number;
		memoryMB: number;
		cpuPercent: number;
	};
}

export interface AdaptedStrategy {
	strategy: Strategy;
	reasoning: string;
	confidence: number;
	adjustments: string[];
}

export interface LearningUpdate {
	updatedHeuristics: string[];
	confidenceImprovement: number;
	recommendations: string[];
}

export interface ThresholdUpdate {
	newThresholds: {
		complexity: number;
		branches: number;
		dataSize: number;
	};
	rationale: string;
}

export interface StrategyDecision {
	strategy: Strategy;
	reasoning: {
		factors: string[];
		confidence: number;
		alternatives: { strategy: Strategy; score: number }[];
	};
}

export interface StrategyConfiguration {
	parallelThreshold: number;
	branchThreshold: number;
	dataSizeThreshold: number;
	riskTolerance: number;
}

/**
 * Enhanced StrategySelector for Phase 1.2 nO Architecture
 *
 * Features:
 * - Multi-objective optimization
 * - Performance prediction
 * - Dynamic adaptation to runtime conditions
 * - Learning from execution outcomes
 * - Advanced reasoning and configuration
 */
export class StrategySelector {
	private configuration: StrategyConfiguration = {
		parallelThreshold: 0.7,
		branchThreshold: 3,
		dataSizeThreshold: 50000,
		riskTolerance: 0.5,
	};

	/**
	 * Original strategy selection method - enhanced for nO architecture
	 */
	selectStrategy(task: TaskProfile): Strategy {
		const isComplex = task.complexity >= this.configuration.parallelThreshold;
		const isModerate =
			task.complexity >= 0.5 && task.complexity < this.configuration.parallelThreshold;
		const manyBranches = task.estimatedBranches >= this.configuration.branchThreshold;
		const someBranches = task.estimatedBranches >= 2;
		const bigData = task.dataSize >= this.configuration.dataSizeThreshold;

		// Prefer full parallel coordination for high complexity with many independent branches
		if (task.canParallelize && isComplex && manyBranches) return 'parallel-coordinated';

		// Hybrid: moderate complexity or some branching or large datasets that benefit from fan-out then merge
		if (task.canParallelize && (isModerate || someBranches || bigData)) return 'hybrid';

		// Default: safer sequential path
		return 'sequential-safe';
	}

	/**
	 * Multi-objective optimization for strategy selection
	 */
	async optimizeMultiObjective(
		profile: TaskProfile,
		objectives: Array<{ type: string; weight: number; target: string }>,
	): Promise<MultiObjectiveResult> {
		// Calculate weighted score based on objectives
		const totalWeight = objectives.reduce((sum, obj) => sum + obj.weight, 0);
		const normalizedObjectives = objectives.map((obj) => ({
			...obj,
			normalizedWeight: obj.weight / totalWeight,
		}));

		// Score each strategy against objectives
		const strategies: Strategy[] = ['sequential-safe', 'hybrid', 'parallel-coordinated'];
		const scores = strategies.map((strategy) => {
			let score = 0;
			const tradeoffs: string[] = [];

			normalizedObjectives.forEach((obj) => {
				let objectiveScore = 0;

				switch (obj.type) {
					case 'performance':
					case 'speed':
						objectiveScore =
							strategy === 'parallel-coordinated' ? 0.9 : strategy === 'hybrid' ? 0.7 : 0.5;
						if (strategy === 'parallel-coordinated') tradeoffs.push('high_resource_usage');
						break;
					case 'reliability':
					case 'fault_tolerance':
						objectiveScore =
							strategy === 'sequential-safe' ? 0.9 : strategy === 'hybrid' ? 0.7 : 0.6;
						if (strategy === 'sequential-safe') tradeoffs.push('slower_execution');
						break;
					case 'resource_efficiency':
						objectiveScore =
							strategy === 'sequential-safe' ? 0.8 : strategy === 'hybrid' ? 0.6 : 0.4;
						break;
					default:
						objectiveScore = 0.5; // neutral
				}

				score += objectiveScore * obj.normalizedWeight;
			});

			return { strategy, score, tradeoffs: Array.from(new Set(tradeoffs)) };
		});

		// Select best strategy
		const bestStrategy = scores.reduce((best, current) =>
			current.score > best.score ? current : best,
		);

		return {
			score: bestStrategy.score,
			recommendedStrategy: bestStrategy.strategy,
			tradeoffs: bestStrategy.tradeoffs,
			notes: [
				`Optimized for ${objectives.map(o => o.type).join(', ')}`,
				`Profile complexity=${profile.complexity}, branches=${profile.estimatedBranches}, dataSize=${profile.dataSize}`,
				'Multi-objective analysis',
			],
		};
	}

	/**
	 * Predict performance for different strategies
	 */
	async predictPerformance(profile: TaskProfile): Promise<PerformancePrediction> {
		const strategies: Strategy[] = ['sequential-safe', 'hybrid', 'parallel-coordinated'];

		const predictions = strategies.map((strategy) => {
			const baseTime = 1000 + profile.complexity * 5000;
			const dataPenalty = Math.log(profile.dataSize / 1000) * 200;

			let durationMs: number;
			let successProbability: number;
			let concurrentAgents: number;
			let memoryMB: number;
			let cpuPercent: number;

			switch (strategy) {
				case 'sequential-safe':
					durationMs = baseTime + dataPenalty;
					successProbability = 0.95 - profile.complexity * 0.1;
					concurrentAgents = 1;
					memoryMB = 256 + profile.dataSize / 1000;
					cpuPercent = 30 + profile.complexity * 20;
					break;
				case 'hybrid':
					durationMs = (baseTime + dataPenalty) * 0.7;
					successProbability = 0.85 - profile.complexity * 0.15;
					concurrentAgents = Math.min(3, profile.estimatedBranches);
					memoryMB = (256 + profile.dataSize / 1000) * 1.5;
					cpuPercent = 50 + profile.complexity * 25;
					break;
				case 'parallel-coordinated':
					durationMs = (baseTime + dataPenalty) * 0.4;
					successProbability = 0.8 - profile.complexity * 0.2;
					concurrentAgents = Math.min(5, profile.estimatedBranches);
					memoryMB = (256 + profile.dataSize / 1000) * 2;
					cpuPercent = 70 + profile.complexity * 30;
					break;
			}

			return {
				name: strategy,
				predictedDurationMs: Math.round(durationMs),
				successProbability: Math.max(0.1, Math.min(1.0, successProbability)),
				resourceEstimate: {
					concurrentAgents,
					memoryMB: Math.round(memoryMB),
					cpuPercent: Math.round(Math.min(100, cpuPercent)),
				},
			};
		});

		return { strategies: predictions };
	}

	/**
	 * Adapt strategy based on runtime conditions
	 */
	async adaptToConditions(
		profile: TaskProfile,
		conditions: {
			availableAgents: number;
			systemLoad: number;
			networkLatency: number;
			errorRate: number;
		}
	): Promise<AdaptedStrategy> {
		const baseStrategy = this.selectStrategy(profile);
		const adjustments: string[] = [];
		let finalStrategy: Strategy = baseStrategy;
		let reasoning = `Base strategy: ${baseStrategy}`;
		let confidence = 0.8;

		// Adapt based on available agents
		if (conditions.availableAgents === 1) {
			finalStrategy = 'sequential-safe';
			adjustments.push('reduce_parallelism');
			reasoning += '; forced sequential due to single agent';
			confidence *= 0.9;
		}

		// Adapt based on system load
		if (conditions.systemLoad > 0.8) {
			if (finalStrategy === 'parallel-coordinated') {
				finalStrategy = 'hybrid';
				adjustments.push('reduce_parallelism');
				reasoning += '; reduced parallelism due to high system load';
			}
			confidence *= 0.8;
		}

		// Adapt based on error rate
		if (conditions.errorRate > 0.15) {
			if (finalStrategy !== 'sequential-safe') {
				finalStrategy = 'sequential-safe';
				adjustments.push('increase_reliability');
				reasoning += '; switched to sequential for reliability due to high error rate';
			}
			confidence *= 0.7;
		}

		// Check if we're in constrained environment
		if (
			conditions.availableAgents <= 1 ||
			conditions.systemLoad > 0.9 ||
			conditions.errorRate > 0.2
		) {
			reasoning += '; constrained environment detected';
			if (!adjustments.includes('reduce_parallelism')) {
				adjustments.push('reduce_parallelism');
			}
		}

		return {
			strategy: finalStrategy,
			reasoning,
			confidence: Math.max(0.1, confidence),
			adjustments,
		};
	}

	/**
	 * Learn from execution outcomes
	 */
	async learnFromOutcomes(
		outcomes: Array<{
			profile: TaskProfile;
			selectedStrategy: string;
			actualDurationMs: number;
			predictedDurationMs: number;
			successRate: number;
			resourceUsage: {
				memoryMB: number;
				cpuPercent: number;
			};
		}>
	): Promise<LearningUpdate> {
		const heuristics: string[] = [];
		const recommendations: string[] = [];
		let confidenceImprovement = 0;

		// Analyze prediction accuracy
		const accuracyScores = outcomes.map((outcome) => {
			const durationAccuracy =
				1 -
				Math.abs(outcome.actualDurationMs - outcome.predictedDurationMs) /
				outcome.predictedDurationMs;
			return Math.max(0, Math.min(1, durationAccuracy));
		});

		const avgAccuracy = accuracyScores.reduce((sum, acc) => sum + acc, 0) / accuracyScores.length;
		confidenceImprovement = (avgAccuracy - 0.5) * 0.2; // Modest improvement based on accuracy

		// Identify patterns
		const parallelOutcomes = outcomes.filter((o) => o.selectedStrategy === 'parallel-coordinated');
		const sequentialOutcomes = outcomes.filter((o) => o.selectedStrategy === 'sequential-safe');

		if (parallelOutcomes.length > 0) {
			const avgParallelSuccess =
				parallelOutcomes.reduce((sum, o) => sum + o.successRate, 0) / parallelOutcomes.length;
			if (avgParallelSuccess > 0.9) {
				heuristics.push('parallel_coordination_effective');
				recommendations.push('increase_parallel_threshold');
			} else if (avgParallelSuccess < 0.7) {
				heuristics.push('parallel_coordination_risky');
				recommendations.push('increase_reliability_checks');
			}
		}

		if (sequentialOutcomes.length > 0) {
			const avgSequentialSuccess =
				sequentialOutcomes.reduce((sum, o) => sum + o.successRate, 0) / sequentialOutcomes.length;
			if (avgSequentialSuccess > 0.95) {
				heuristics.push('sequential_highly_reliable');
				recommendations.push('consider_more_parallel_strategies');
			}
		}

		return {
			updatedHeuristics: heuristics,
			confidenceImprovement: Math.max(0, confidenceImprovement),
			recommendations,
		};
	}

	/**
	 * Update strategy selection thresholds based on historical data
	 */
	async updateThresholds(
		historicalData: Array<{
			complexity: number;
			strategy: string;
			performance: number;
		}>
	): Promise<ThresholdUpdate> {
		// Find optimal complexity threshold for parallel strategies
		const parallelData = historicalData.filter((d) => d.strategy === 'parallel-coordinated');
		const goodParallelData = parallelData.filter((d) => d.performance > 0.8);

		let newComplexityThreshold = this.configuration.parallelThreshold;
		if (goodParallelData.length > 0) {
			const minGoodComplexity = Math.min(...goodParallelData.map((d) => d.complexity));
			newComplexityThreshold = Math.max(0.5, minGoodComplexity - 0.1);
		}

		// Analyze branch count effectiveness
		const hybridData = historicalData.filter((d) => d.strategy === 'hybrid');
		const avgHybridPerformance =
			hybridData.length > 0
				? hybridData.reduce((sum, d) => sum + d.performance, 0) / hybridData.length
				: 0.5;

		let newBranchThreshold = this.configuration.branchThreshold;
		if (avgHybridPerformance > 0.8) {
			newBranchThreshold = Math.max(2, this.configuration.branchThreshold - 1);
		} else if (avgHybridPerformance < 0.6) {
			newBranchThreshold = Math.min(5, this.configuration.branchThreshold + 1);
		}

		return {
			newThresholds: {
				complexity: newComplexityThreshold,
				branches: newBranchThreshold,
				dataSize: this.configuration.dataSizeThreshold, // Keep stable for now
			},
			rationale: `Updated based on ${historicalData.length} historical executions. Complexity threshold: ${newComplexityThreshold.toFixed(2)}, Branch threshold: ${newBranchThreshold}`,
		};
	}

	/**
	 * Update configuration with custom values
	 */
	updateConfiguration(config: Partial<StrategyConfiguration>): void {
		this.configuration = { ...this.configuration, ...config };
	}

	/**
	 * Select strategy with detailed reasoning
	 */
	selectStrategyWithReasoning(profile: TaskProfile): StrategyDecision {
		const factors: string[] = [];
		const alternatives: { strategy: Strategy; score: number }[] = [];

		// Evaluate each strategy
		const strategies: Strategy[] = ['sequential-safe', 'hybrid', 'parallel-coordinated'];

		strategies.forEach((strategy) => {
			let score = 0.5; // base score

			switch (strategy) {
				case 'sequential-safe':
					score += 0.3; // reliability bonus
					if (!profile.canParallelize) score += 0.2;
					if (profile.complexity < 0.5) score += 0.2;
					break;
				case 'parallel-coordinated':
					if (profile.canParallelize) score += 0.2;
					if (profile.complexity > 0.7) score += 0.3;
					if (profile.estimatedBranches >= 3) score += 0.2;
					else score -= 0.2; // penalty for few branches
					break;
				case 'hybrid':
					if (profile.canParallelize) score += 0.1;
					if (profile.complexity > 0.4 && profile.complexity < 0.8) score += 0.2;
					if (profile.estimatedBranches >= 2) score += 0.1;
					break;
			}

			alternatives.push({ strategy, score: Math.max(0, Math.min(1, score)) });
		});

		// Sort by score and select best
		alternatives.sort((a, b) => b.score - a.score);
		const selectedStrategy = alternatives[0].strategy;

		// Build reasoning factors
		if (profile.complexity > 0.7) factors.push('high_complexity');
		if (profile.complexity < 0.3) factors.push('low_complexity');
		if (profile.canParallelize) factors.push('parallelizable');
		if (profile.estimatedBranches >= 3) factors.push('many_branches');
		if (profile.dataSize > 10000) factors.push('large_dataset');

		return {
			strategy: selectedStrategy,
			reasoning: {
				factors,
				confidence: alternatives[0].score,
				alternatives,
			},
		};
	}
}
