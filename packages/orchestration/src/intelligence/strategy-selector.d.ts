export type TaskProfile = {
	description: string;
	complexity: number;
	canParallelize: boolean;
	estimatedBranches: number;
	dataSize: number;
};
export type Strategy = 'parallel-coordinated' | 'sequential-safe' | 'hybrid';
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
		alternatives: {
			strategy: Strategy;
			score: number;
		}[];
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
export declare class StrategySelector {
	private configuration;
	/**
	 * Original strategy selection method - enhanced for nO architecture
	 */
	selectStrategy(task: TaskProfile): Strategy;
	/**
	 * Multi-objective optimization for strategy selection
	 */
	optimizeMultiObjective(
		profile: TaskProfile,
		objectives: Array<{
			type: string;
			weight: number;
			target: string;
		}>,
	): Promise<MultiObjectiveResult>;
	/**
	 * Predict performance for different strategies
	 */
	predictPerformance(profile: TaskProfile): Promise<PerformancePrediction>;
	/**
	 * Adapt strategy based on runtime conditions
	 */
	adaptToConditions(
		profile: TaskProfile,
		conditions: {
			availableAgents: number;
			systemLoad: number;
			networkLatency: number;
			errorRate: number;
		},
	): Promise<AdaptedStrategy>;
	/**
	 * Learn from execution outcomes
	 */
	learnFromOutcomes(
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
		}>,
	): Promise<LearningUpdate>;
	/**
	 * Update strategy selection thresholds based on historical data
	 */
	updateThresholds(
		historicalData: Array<{
			complexity: number;
			strategy: string;
			performance: number;
		}>,
	): Promise<ThresholdUpdate>;
	/**
	 * Update configuration with custom values
	 */
	updateConfiguration(config: Partial<StrategyConfiguration>): void;
	/**
	 * Select strategy with detailed reasoning
	 */
	selectStrategyWithReasoning(profile: TaskProfile): StrategyDecision;
}
//# sourceMappingURL=strategy-selector.d.ts.map
