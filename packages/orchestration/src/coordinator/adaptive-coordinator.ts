/**
 * Adaptive Coordination Manager for Cortex-OS
 * Implements dynamic strategy selection based on task characteristics
 * Integrates with enhanced DSP and follows nO Master Agent Loop architecture
 * Maintains brAInwav branding throughout
 */

import type { LongHorizonPlanner, LongHorizonTask } from '../lib/long-horizon-planner.js';
import { type Agent, type AgentAssignment, OrchestrationStrategy } from '../types.js';
import type { PlanningContext } from '../utils/dsp.js';

export interface CoordinationMetrics {
	efficiency: number; // 0-1 scale
	quality: number; // 0-1 scale
	speed: number; // 0-1 scale
	resourceUtilization: number; // 0-1 scale
}

export interface StrategyPerformance {
	strategy: OrchestrationStrategy;
	successRate: number;
	averageEfficiency: number;
	averageQuality: number;
	averageSpeed: number;
	totalExecutions: number;
	lastUsed: Date;
	taskComplexityRange: [number, number];
}

export interface AdaptiveCoordinationConfig {
	learningEnabled: boolean;
	contextIsolationEnabled: boolean;
	maxHistorySize: number;
	strategyTimeoutMs: number;
	performanceThreshold: number;
	nOArchitectureEnabled: boolean;
}

export interface CoordinationRequest {
	task: LongHorizonTask;
	availableAgents: Agent[];
	constraints: {
		maxDuration: number;
		maxAgents: number;
		requiredCapabilities: string[];
	};
	context?: PlanningContext;
}

export interface CoordinationResult {
	strategy: OrchestrationStrategy;
	assignments: AgentAssignment[];
	estimatedDuration: number;
	confidence: number;
	reasoning: string;
	metrics: CoordinationMetrics;
	brainwavMetadata: {
		coordinatedBy: 'brAInwav';
		timestamp: Date;
		version: string;
		nOArchitecture: boolean;
	};
}

/**
 * Adaptive coordinator that selects optimal coordination strategies
 * following nO Master Agent Loop architecture patterns
 */
export class AdaptiveCoordinationManager {
	private readonly config: AdaptiveCoordinationConfig;
	private readonly strategyPerformance: Map<OrchestrationStrategy, StrategyPerformance>;
	private readonly executionHistory: Array<{
		task: LongHorizonTask;
		strategy: OrchestrationStrategy;
		result: CoordinationResult;
		actualMetrics: CoordinationMetrics;
	}>;
	private longHorizonPlanner?: LongHorizonPlanner;

	constructor(config: Partial<AdaptiveCoordinationConfig> = {}) {
		this.config = {
			learningEnabled: true,
			contextIsolationEnabled: true,
			maxHistorySize: 1000,
			strategyTimeoutMs: 30000,
			performanceThreshold: 0.7,
			nOArchitectureEnabled: true,
			...config,
		};

		this.strategyPerformance = new Map();
		this.executionHistory = [];

		// Initialize strategy performance tracking
		this.initializeStrategyTracking();

		console.log(
			'brAInwav Adaptive Coordinator: Initialized with nO Master Agent Loop architecture',
		);
	}

	/**
	 * Set long-horizon planner for integration
	 */
	setLongHorizonPlanner(planner: LongHorizonPlanner): void {
		this.longHorizonPlanner = planner;
		console.log(
			'brAInwav Adaptive Coordinator: Integrated with Long-Horizon Planner following nO architecture',
		);
	}

	/**
	 * Coordinate agents for a task using adaptive strategy selection
	 * Following nO Master Agent Loop patterns
	 */
	async coordinate(request: CoordinationRequest): Promise<CoordinationResult> {
		console.log(
			`brAInwav Adaptive Coordinator: Starting nO coordination for task ${request.task.id}`,
		);

		// Select optimal strategy based on task characteristics and nO patterns
		const selectedStrategy = this.selectOptimalStrategy(request);

		console.log(
			`brAInwav Adaptive Coordinator: Selected ${selectedStrategy} strategy for task ${request.task.id} using nO architecture`,
		);

		// Execute coordination with selected strategy
		const result = await this.executeCoordination(request, selectedStrategy);

		// Record execution for learning
		if (this.config.learningEnabled) {
			this.recordExecution(request, result);
		}

		return result;
	}

	/**
	 * Select optimal coordination strategy based on task characteristics
	 * Aligned with nO Master Agent Loop architecture
	 */
	private selectOptimalStrategy(request: CoordinationRequest): OrchestrationStrategy {
		const { task, availableAgents, constraints } = request;

		// Calculate task characteristics for nO strategy selection
		const agentCount = availableAgents.length;
		const complexity = task.complexity;
		const priority = task.priority;
		const hasMultipleCapabilities = constraints.requiredCapabilities.length > 1;

		// nO-aligned strategy selection logic
		let candidateStrategies: OrchestrationStrategy[] = [];

		// Simple tasks with single capability requirement
		if (complexity <= 3 && !hasMultipleCapabilities) {
			candidateStrategies = [OrchestrationStrategy.SEQUENTIAL];
		}
		// Medium complexity tasks
		else if (complexity <= 6) {
			candidateStrategies = [OrchestrationStrategy.SEQUENTIAL, OrchestrationStrategy.PARALLEL];
		}
		// High complexity tasks
		else if (complexity <= 8) {
			candidateStrategies = [OrchestrationStrategy.PARALLEL, OrchestrationStrategy.HIERARCHICAL];
		}
		// Very complex tasks - use nO adaptive patterns
		else {
			candidateStrategies = [OrchestrationStrategy.HIERARCHICAL, OrchestrationStrategy.ADAPTIVE];
		}

		// High priority tasks prefer faster strategies in nO architecture
		if (priority > 8) {
			candidateStrategies = candidateStrategies.filter((s) => s !== OrchestrationStrategy.REACTIVE);
		}

		// Limited agents favor simpler strategies in nO patterns
		if (agentCount < 3) {
			candidateStrategies = candidateStrategies.filter(
				(s) => s !== OrchestrationStrategy.HIERARCHICAL && s !== OrchestrationStrategy.ADAPTIVE,
			);
		}

		// Select best performing strategy from candidates
		return this.selectBestPerformingStrategy(candidateStrategies, task);
	}

	/**
	 * Select best performing strategy from candidates based on nO architecture patterns
	 */
	private selectBestPerformingStrategy(
		candidates: OrchestrationStrategy[],
		task: LongHorizonTask,
	): OrchestrationStrategy {
		if (candidates.length === 0) {
			return OrchestrationStrategy.SEQUENTIAL; // nO fallback
		}

		if (candidates.length === 1) {
			return candidates[0];
		}

		// If learning is disabled or no history, use first candidate
		if (!this.config.learningEnabled || this.executionHistory.length === 0) {
			return candidates[0];
		}

		// Find best performing strategy among candidates
		let bestStrategy = candidates[0];
		let bestScore = 0;

		for (const strategy of candidates) {
			const performance = this.strategyPerformance.get(strategy);
			if (performance) {
				// Calculate composite score based on success rate and efficiency
				const score = performance.successRate * 0.6 + performance.averageEfficiency * 0.4;

				// Bonus for strategies that work well with similar complexity
				const complexityMatch = this.isComplexityMatch(
					performance.taskComplexityRange,
					task.complexity,
				);
				const complexityBonus = complexityMatch ? 0.1 : 0;

				const totalScore = score + complexityBonus;

				if (totalScore > bestScore) {
					bestScore = totalScore;
					bestStrategy = strategy;
				}
			}
		}

		return bestStrategy;
	}

	/**
	 * Execute coordination with selected strategy following nO architecture
	 */
	private async executeCoordination(
		request: CoordinationRequest,
		strategy: OrchestrationStrategy,
	): Promise<CoordinationResult> {
		const startTime = Date.now();

		// Generate agent assignments based on nO strategy patterns
		const assignments = this.generateNOAssignments(request, strategy);

		// Estimate duration based on strategy and task complexity
		const estimatedDuration = this.estimateDuration(request, strategy, assignments);

		// Calculate confidence based on historical performance
		const confidence = this.calculateConfidence(strategy, request.task);

		// Generate reasoning for strategy selection
		const reasoning = this.generateReasoning(request, strategy);

		// Calculate current metrics (placeholder - would be from actual execution)
		const metrics: CoordinationMetrics = {
			efficiency: 0.8,
			quality: 0.85,
			speed: 0.9,
			resourceUtilization: assignments.length / request.availableAgents.length,
		};

		const result: CoordinationResult = {
			strategy,
			assignments,
			estimatedDuration,
			confidence,
			reasoning,
			metrics,
			brainwavMetadata: {
				coordinatedBy: 'brAInwav',
				timestamp: new Date(),
				version: '1.0.0',
				nOArchitecture: this.config.nOArchitectureEnabled,
			},
		};

		const executionTime = Date.now() - startTime;
		console.log(`brAInwav Adaptive Coordinator: Completed nO coordination in ${executionTime}ms`);

		return result;
	}

	/**
	 * Generate agent assignments based on nO Master Agent Loop patterns
	 */
	private generateNOAssignments(
		request: CoordinationRequest,
		strategy: OrchestrationStrategy,
	): AgentAssignment[] {
		const { task, availableAgents, constraints } = request;
		const assignments: AgentAssignment[] = [];

		switch (strategy) {
			case OrchestrationStrategy.SEQUENTIAL: {
				// nO sequential assignment pattern
				const bestAgent = this.selectBestAgent(availableAgents, constraints.requiredCapabilities);
				if (bestAgent) {
					assignments.push(this.createAssignment(bestAgent, task, 'nO-sequential-primary'));
				}
				break;
			}

			case OrchestrationStrategy.PARALLEL: {
				// nO parallel assignment pattern
				const sortedAgents = this.sortAgentsByCapability(
					availableAgents,
					constraints.requiredCapabilities,
				);
				for (let i = 0; i < Math.min(sortedAgents.length, constraints.maxAgents); i++) {
					assignments.push(this.createAssignment(sortedAgents[i], task, `nO-parallel-${i}`));
				}
				break;
			}

			case OrchestrationStrategy.ADAPTIVE: {
				// nO adaptive assignment pattern - core of Master Agent Loop
				const adaptiveAgents = availableAgents.slice(0, Math.min(3, constraints.maxAgents));
				adaptiveAgents.forEach((agent, index) => {
					assignments.push(this.createAssignment(agent, task, `nO-adaptive-${index}`));
				});
				break;
			}

			case OrchestrationStrategy.HIERARCHICAL: {
				// nO hierarchical assignment with coordinator pattern
				const coordinator = this.selectBestAgent(availableAgents, ['coordination']);
				const workers = availableAgents
					.filter((a) => a !== coordinator)
					.slice(0, constraints.maxAgents - 1);

				if (coordinator) {
					assignments.push(this.createAssignment(coordinator, task, 'nO-coordinator'));
				}
				workers.forEach((agent, index) => {
					assignments.push(this.createAssignment(agent, task, `nO-worker-${index}`));
				});
				break;
			}

			case OrchestrationStrategy.REACTIVE: {
				// nO reactive pattern for dynamic response
				const reactiveAgent = this.selectBestAgent(availableAgents, ['monitoring', 'reactive']);
				if (reactiveAgent) {
					assignments.push(this.createAssignment(reactiveAgent, task, 'nO-reactive'));
				}
				break;
			}

			default: {
				// nO fallback pattern
				const fallbackAgent = availableAgents[0];
				if (fallbackAgent) {
					assignments.push(this.createAssignment(fallbackAgent, task, 'nO-fallback'));
				}
			}
		}

		return assignments;
	}

	/**
	 * Helper methods for agent selection and assignment
	 */
	private selectBestAgent(agents: Agent[], requiredCapabilities: string[]): Agent | undefined {
		return agents
			.filter((agent) => requiredCapabilities.every((cap) => agent.capabilities.includes(cap)))
			.sort((a, b) => b.capabilities.length - a.capabilities.length)[0];
	}

	private sortAgentsByCapability(agents: Agent[], requiredCapabilities: string[]): Agent[] {
		return agents
			.filter((agent) => requiredCapabilities.some((cap) => agent.capabilities.includes(cap)))
			.sort((a, b) => {
				const aMatches = requiredCapabilities.filter((cap) => a.capabilities.includes(cap)).length;
				const bMatches = requiredCapabilities.filter((cap) => b.capabilities.includes(cap)).length;
				return bMatches - aMatches;
			});
	}

	private createAssignment(agent: Agent, task: LongHorizonTask, phase: string): AgentAssignment {
		return {
			agentId: agent.id,
			taskId: task.id,
			phase,
			role: agent.role,
			startTime: new Date(),
			status: 'pending' as const,
		};
	}

	private estimateDuration(
		request: CoordinationRequest,
		strategy: OrchestrationStrategy,
		assignments: AgentAssignment[],
	): number {
		const baseTime = request.task.estimatedDuration;
		const complexityMultiplier = request.task.complexity / 5;
		const strategyMultiplier = this.getStrategyTimeMultiplier(strategy);
		const agentMultiplier = assignments.length > 1 ? 0.8 : 1.0; // Parallel execution bonus

		return Math.ceil(baseTime * complexityMultiplier * strategyMultiplier * agentMultiplier);
	}

	private getStrategyTimeMultiplier(strategy: OrchestrationStrategy): number {
		switch (strategy) {
			case OrchestrationStrategy.SEQUENTIAL:
				return 1.0;
			case OrchestrationStrategy.PARALLEL:
				return 0.8;
			case OrchestrationStrategy.ADAPTIVE:
				return 0.9; // nO optimized
			case OrchestrationStrategy.HIERARCHICAL:
				return 1.1;
			case OrchestrationStrategy.REACTIVE:
				return 1.2;
			default:
				return 1.0;
		}
	}

	private calculateConfidence(strategy: OrchestrationStrategy, task: LongHorizonTask): number {
		const performance = this.strategyPerformance.get(strategy);
		if (!performance || performance.totalExecutions < 3) {
			return 0.5; // Low confidence for untested strategies
		}

		// Base confidence on success rate and complexity match
		let confidence = performance.successRate;

		if (this.isComplexityMatch(performance.taskComplexityRange, task.complexity)) {
			confidence += 0.1; // Bonus for complexity match
		}

		return Math.min(confidence, 1.0);
	}

	private generateReasoning(request: CoordinationRequest, strategy: OrchestrationStrategy): string {
		const { task, availableAgents } = request;
		return (
			`brAInwav nO Architecture: Selected ${strategy} strategy for task ${task.id} based on complexity level ${task.complexity}, ` +
			`priority ${task.priority}, and ${availableAgents.length} available agents. ` +
			`Master Agent Loop patterns indicate this strategy is optimal for similar task characteristics.`
		);
	}

	private isComplexityMatch(range: [number, number], complexity: number): boolean {
		return complexity >= range[0] && complexity <= range[1];
	}

	/**
	 * Initialize strategy performance tracking with nO architecture awareness
	 */
	private initializeStrategyTracking(): void {
		const strategies = Object.values(OrchestrationStrategy);
		for (const strategy of strategies) {
			this.strategyPerformance.set(strategy, {
				strategy,
				successRate: 0.5, // Neutral starting point
				averageEfficiency: 0.5,
				averageQuality: 0.5,
				averageSpeed: 0.5,
				totalExecutions: 0,
				lastUsed: new Date(),
				taskComplexityRange: [1, 10],
			});
		}
	}

	/**
	 * Record execution results for learning
	 */
	private recordExecution(request: CoordinationRequest, result: CoordinationResult): void {
		// Add to execution history
		this.executionHistory.push({
			task: request.task,
			strategy: result.strategy,
			result,
			actualMetrics: result.metrics,
		});

		// Trim history if too large
		if (this.executionHistory.length > this.config.maxHistorySize) {
			this.executionHistory.shift();
		}

		// Update strategy performance
		this.updateStrategyPerformance(result.strategy, request.task, result.metrics);

		console.log(
			`brAInwav Adaptive Coordinator: Recorded nO execution data for strategy ${result.strategy}`,
		);
	}

	/**
	 * Update strategy performance metrics
	 */
	private updateStrategyPerformance(
		strategy: OrchestrationStrategy,
		task: LongHorizonTask,
		metrics: CoordinationMetrics,
	): void {
		const performance = this.strategyPerformance.get(strategy);
		if (!performance) return;

		const executions = performance.totalExecutions;

		// Update averages with weighted calculation
		performance.averageEfficiency =
			(performance.averageEfficiency * executions + metrics.efficiency) / (executions + 1);
		performance.averageQuality =
			(performance.averageQuality * executions + metrics.quality) / (executions + 1);
		performance.averageSpeed =
			(performance.averageSpeed * executions + metrics.speed) / (executions + 1);

		// Update success rate (assuming metrics.quality > threshold indicates success)
		const isSuccess = metrics.quality > this.config.performanceThreshold;
		performance.successRate =
			(performance.successRate * executions + (isSuccess ? 1 : 0)) / (executions + 1);

		// Update complexity range
		performance.taskComplexityRange = [
			Math.min(performance.taskComplexityRange[0], task.complexity),
			Math.max(performance.taskComplexityRange[1], task.complexity),
		];

		performance.totalExecutions = executions + 1;
		performance.lastUsed = new Date();
	}

	/**
	 * Get coordination statistics for monitoring nO architecture performance
	 */
	getStats(): {
		totalExecutions: number;
		strategyPerformance: StrategyPerformance[];
		recentExecutions: number;
		learningEnabled: boolean;
		nOArchitectureEnabled: boolean;
	} {
		const recentThreshold = Date.now() - 24 * 60 * 60 * 1000; // 24 hours
		const recentExecutions = this.executionHistory.filter(
			(exec) => exec.result.brainwavMetadata.timestamp.getTime() > recentThreshold,
		).length;

		return {
			totalExecutions: this.executionHistory.length,
			strategyPerformance: Array.from(this.strategyPerformance.values()),
			recentExecutions,
			learningEnabled: this.config.learningEnabled,
			nOArchitectureEnabled: this.config.nOArchitectureEnabled,
		};
	}
}
