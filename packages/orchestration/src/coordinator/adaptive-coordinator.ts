import type {
	LongHorizonPlanner,
	LongHorizonTask,
	PlanningResult,
} from '../lib/long-horizon-planner.js';
import type { Agent, AgentRole, OrchestrationStrategy } from '../types.js';
import type { PlanningContext, PlanningPhase } from '../utils/dsp.js';
import {
	type StrategyScore,
	type StrategySelectionCriteria,
	StrategySelector,
} from './strategy-selector.js';

export interface CoordinationConstraints {
	maxDuration: number;
	maxAgents: number;
	requiredCapabilities: string[];
}

export interface CoordinationRequest {
	task: LongHorizonTask;
	availableAgents: Agent[];
	constraints: CoordinationConstraints;
	context?: PlanningContext;
	planningResult?: PlanningResult;
}

export interface CoordinationAssignment {
	agentId: string;
	taskId: string;
	phase: string;
	role: AgentRole;
	confidence: number;
	capabilityMatch: number;
	capabilitiesUsed: string[];
}

export interface CoordinationMetrics {
	estimatedEfficiency: number;
	estimatedQuality: number;
	estimatedDuration: number;
	resourceUtilization: number;
	speedScore: number;
}

export interface CoordinationTelemetryEvent {
	branding: 'brAInwav';
	type: 'strategy_selected' | 'assignments_created' | 'metrics_estimated';
	message: string;
	timestamp: Date;
	metadata?: Record<string, unknown>;
}

export interface CoordinationResult {
	taskId: string;
	strategy: OrchestrationStrategy;
	assignments: CoordinationAssignment[];
	confidence: number;
	reasoning: string[];
	metrics: CoordinationMetrics;
	estimatedDuration: number;
	coordinationScore: number;
	brainwavMetadata: {
		coordinatedBy: 'brAInwav';
		timestamp: Date;
		version: string;
		contextId: string | null;
	};
	telemetry: CoordinationTelemetryEvent[];
	planningContext?: PlanningContext;
	plannerStats?: {
		hasActiveContext: boolean;
		currentStep: number;
		currentPhase?: PlanningPhase;
		adaptiveDepth: number;
	};
	planningSummary?: {
		success: boolean;
		phases: number;
		recommendations: string[];
	};
}

export interface AdaptiveCoordinationConfig {
	learningEnabled?: boolean;
	contextIsolationEnabled?: boolean;
	maxHistorySize?: number;
	strategyTimeoutMs?: number;
	performanceThreshold?: number;
	nOArchitectureEnabled?: boolean;
	telemetryEnabled?: boolean;
	telemetryEmitter?: (event: CoordinationTelemetryEvent) => void;
}

export interface CoordinationManagerStats {
	strategiesTracked: number;
	totalExecutions: number;
	learningEnabled: boolean;
	lastStrategy: OrchestrationStrategy | null;
	lastConfidence: number | null;
	brainwavOptimized: boolean;
}

type PerformanceRecord = {
	efficiency: number;
	quality: number;
	speed: number;
	resourceUtilization: number;
	timestamp: Date;
	taskId: string;
};

type SelectionRecord = {
	taskId: string;
	strategy: OrchestrationStrategy;
	confidence: number;
	metrics: CoordinationMetrics;
	timestamp: Date;
};

const DEFAULT_CONFIG: Required<Omit<AdaptiveCoordinationConfig, 'telemetryEmitter'>> = {
	learningEnabled: true,
	contextIsolationEnabled: true,
	maxHistorySize: 50,
	strategyTimeoutMs: 10_000,
	performanceThreshold: 0.7,
	nOArchitectureEnabled: true,
	telemetryEnabled: true,
};

export class AdaptiveCoordinationManager {
	private readonly config: Required<Omit<AdaptiveCoordinationConfig, 'telemetryEmitter'>>;
	private readonly telemetryEmitter?: (event: CoordinationTelemetryEvent) => void;
	private readonly selector: StrategySelector;
	private readonly performanceHistory = new Map<OrchestrationStrategy, PerformanceRecord[]>();
	private readonly selectionHistory: SelectionRecord[] = [];
	private longHorizonPlanner?: LongHorizonPlanner;

	constructor(config: AdaptiveCoordinationConfig = {}) {
		const { telemetryEmitter, ...configWithoutEmitter } = config;
		this.config = { ...DEFAULT_CONFIG, ...configWithoutEmitter };
		this.telemetryEmitter = telemetryEmitter;
		this.selector = new StrategySelector({
			learningEnabled: this.config.learningEnabled,
			adaptiveWeightingEnabled: true,
			nOArchitectureOptimized: this.config.nOArchitectureEnabled,
			performanceThreshold: this.config.performanceThreshold,
			maxHistorySize: this.config.maxHistorySize,
			brainwavTelemetryEnabled: this.config.telemetryEnabled,
		});

		console.log('brAInwav Adaptive Coordinator: Initialized with adaptive strategy selection');
	}

	setLongHorizonPlanner(planner: LongHorizonPlanner): void {
		this.longHorizonPlanner = planner;
		console.log('brAInwav Adaptive Coordinator: Connected to LongHorizonPlanner');
	}

	async coordinate(request: CoordinationRequest): Promise<CoordinationResult> {
		this.validateRequest(request);

		const context =
			this.config.contextIsolationEnabled && request.context
				? this.cloneContext(request.context)
				: request.context;

		const criteria = this.buildCriteria(request, context);
		const strategyScore = this.selector.selectStrategy(criteria);

		const assignments = this.buildAssignments(request, strategyScore.strategy);
		const metrics = this.estimateMetrics(strategyScore, request, assignments);
		const reasoning = this.buildReasoning(strategyScore, request, assignments, metrics);
		const telemetry = this.buildTelemetry(strategyScore, metrics, request.task.id);

		telemetry.forEach((event) => {
			console.log(`brAInwav Adaptive Coordinator: ${event.message}`);
			this.telemetryEmitter?.(event);
		});

		const plannerStats =
			typeof this.longHorizonPlanner?.getStats === 'function'
				? this.longHorizonPlanner.getStats()
				: undefined;
		const coordinationResult: CoordinationResult = {
			taskId: request.task.id,
			strategy: strategyScore.strategy,
			assignments,
			confidence: Number(strategyScore.confidence.toFixed(2)),
			reasoning,
			metrics,
			estimatedDuration: metrics.estimatedDuration,
			coordinationScore: Number(strategyScore.score.toFixed(2)),
			brainwavMetadata: {
				coordinatedBy: 'brAInwav',
				timestamp: new Date(),
				version: '1.0.0',
				contextId: context?.id ?? null,
			},
			telemetry,
			planningContext: context,
			plannerStats,
			planningSummary: request.planningResult
				? {
						success: request.planningResult.success,
						phases: request.planningResult.phases.length,
						recommendations: request.planningResult.recommendations,
					}
				: undefined,
		};

		this.recordSelection(request.task, strategyScore, metrics, assignments);

		return coordinationResult;
	}

	getStats(): CoordinationManagerStats {
		const totalExecutions = Array.from(this.performanceHistory.values()).reduce(
			(acc, history) => acc + history.length,
			0,
		);
		const lastSelection = this.selectionHistory[this.selectionHistory.length - 1];

		return {
			strategiesTracked: this.performanceHistory.size,
			totalExecutions,
			learningEnabled: this.config.learningEnabled,
			lastStrategy: lastSelection?.strategy ?? null,
			lastConfidence: lastSelection?.confidence ?? null,
			brainwavOptimized: this.config.nOArchitectureEnabled,
		};
	}

	private validateRequest(request: CoordinationRequest): void {
		if (request.availableAgents.length === 0) {
			throw new Error(
				'brAInwav Adaptive Coordinator: No agents available for coordination request',
			);
		}

		if (request.constraints.maxAgents <= 0) {
			throw new Error('brAInwav Adaptive Coordinator: Invalid maxAgents constraint');
		}

		if (request.constraints.maxDuration <= 0) {
			throw new Error('brAInwav Adaptive Coordinator: Invalid maxDuration constraint');
		}
	}

	private buildCriteria(
		request: CoordinationRequest,
		context?: PlanningContext,
	): StrategySelectionCriteria {
		return {
			taskComplexity: request.task.complexity,
			taskPriority: request.task.priority,
			agentCount: request.availableAgents.length,
			requiredCapabilities: request.constraints.requiredCapabilities,
			availableTime: request.constraints.maxDuration,
			resourceConstraints: {
				maxAgents: request.constraints.maxAgents,
				maxDuration: request.constraints.maxDuration,
			},
			context,
		};
	}

	private buildAssignments(
		request: CoordinationRequest,
		strategy: OrchestrationStrategy,
	): CoordinationAssignment[] {
		const required = request.constraints.requiredCapabilities;

		const agentScores = request.availableAgents.map((agent) => {
			const capabilityMatch = this.calculateCapabilityMatch(agent.capabilities, required);
			return {
				agent,
				capabilityMatch,
				capabilitiesUsed: this.selectCapabilities(agent.capabilities, required),
			};
		});

		agentScores.sort(
			(a, b) => b.capabilityMatch - a.capabilityMatch || a.agent.role.localeCompare(b.agent.role),
		);

		const limit = Math.min(request.constraints.maxAgents, agentScores.length);
		const phase = this.derivePhaseForStrategy(strategy);

		return agentScores.slice(0, limit).map((entry, index) => ({
			agentId: entry.agent.id,
			taskId: request.task.id,
			phase,
			role: entry.agent.role,
			confidence: Number(Math.max(0.4, entry.capabilityMatch - index * 0.05).toFixed(2)),
			capabilityMatch: entry.capabilityMatch,
			capabilitiesUsed: entry.capabilitiesUsed,
		}));
	}

	private derivePhaseForStrategy(strategy: OrchestrationStrategy): string {
		switch (strategy) {
			case 'parallel':
				return 'execution';
			case 'hierarchical':
				return 'coordination';
			case 'adaptive':
				return 'adaptive-coordination';
			case 'reactive':
				return 'monitoring';
			default:
				return 'strategy';
		}
	}

	private estimateMetrics(
		strategyScore: StrategyScore,
		request: CoordinationRequest,
		assignments: CoordinationAssignment[],
	): CoordinationMetrics {
		const baselineDuration = request.task.estimatedDuration || request.constraints.maxDuration;
		const durationAdjustment = 1 - Math.min(0.4, strategyScore.estimatedEfficiency * 0.2);
		const estimatedDuration = Math.max(500, baselineDuration * durationAdjustment);

		const resourceUtilization = assignments.length / Math.max(1, request.constraints.maxAgents);
		const estimatedQuality = Math.min(1, strategyScore.score + 0.2);
		const speedScore = Math.max(
			0.2,
			1 - estimatedDuration / Math.max(1, request.constraints.maxDuration),
		);

		return {
			estimatedEfficiency: strategyScore.estimatedEfficiency,
			estimatedQuality,
			estimatedDuration,
			resourceUtilization,
			speedScore,
		};
	}

	private buildReasoning(
		strategyScore: StrategyScore,
		request: CoordinationRequest,
		assignments: CoordinationAssignment[],
		metrics: CoordinationMetrics,
	): string[] {
		const reasoning: string[] = [
			`brAInwav selected ${strategyScore.strategy} based on complexity ${request.task.complexity} and priority ${request.task.priority}.`,
			`Capability coverage achieved with ${assignments.length} agent assignments and utilization ${(metrics.resourceUtilization * 100).toFixed(0)}%.`,
		];

		if (request.constraints.requiredCapabilities.length > 0) {
			reasoning.push(
				`Required capabilities: ${request.constraints.requiredCapabilities.join(', ')} were matched with an average confidence of ${this.averageAssignmentConfidence(assignments).toFixed(2)}.`,
			);
		}

		const plannerStats = this.longHorizonPlanner?.getStats();
		if (plannerStats) {
			reasoning.push(
				`Long-horizon planner active context: ${plannerStats.hasActiveContext} at phase ${plannerStats.currentPhase ?? 'unknown'} with adaptive depth ${plannerStats.adaptiveDepth}.`,
			);
		}

		if (request.planningResult) {
			reasoning.push(
				`Planning summary: ${request.planningResult.phases.length} phases executed with ${request.planningResult.success ? 'success' : 'partial failure'}.`,
			);
		}

		return reasoning;
	}

	private buildTelemetry(
		strategyScore: StrategyScore,
		metrics: CoordinationMetrics,
		taskId: string,
	): CoordinationTelemetryEvent[] {
		const timestamp = new Date();

		return [
			{
				branding: 'brAInwav',
				type: 'strategy_selected',
				message: `Selected ${strategyScore.strategy} strategy for task ${taskId}`,
				timestamp,
				metadata: {
					taskId,
					score: Number(strategyScore.score.toFixed(2)),
					confidence: Number(strategyScore.confidence.toFixed(2)),
				},
			},
			{
				branding: 'brAInwav',
				type: 'assignments_created',
				message: `Created assignments for task ${taskId}`,
				timestamp,
				metadata: {
					taskId,
					assignmentCount: metrics.resourceUtilization,
				},
			},
			{
				branding: 'brAInwav',
				type: 'metrics_estimated',
				message: `Estimated coordination metrics for task ${taskId}`,
				timestamp,
				metadata: {
					taskId,
					estimatedDuration: metrics.estimatedDuration,
					estimatedEfficiency: metrics.estimatedEfficiency,
				},
			},
		];
	}

	private recordSelection(
		task: LongHorizonTask,
		strategyScore: StrategyScore,
		metrics: CoordinationMetrics,
		assignments: CoordinationAssignment[],
	): void {
		this.selectionHistory.push({
			taskId: task.id,
			strategy: strategyScore.strategy,
			confidence: Number(strategyScore.confidence.toFixed(2)),
			metrics,
			timestamp: new Date(),
		});

		if (this.selectionHistory.length > this.config.maxHistorySize) {
			this.selectionHistory.splice(0, this.selectionHistory.length - this.config.maxHistorySize);
		}

		this.updateStrategyPerformance(strategyScore.strategy, task, {
			efficiency: metrics.estimatedEfficiency,
			quality: metrics.estimatedQuality,
			speed: metrics.speedScore,
			resourceUtilization: metrics.resourceUtilization,
		});

		if (assignments.length === 0) {
			console.warn(
				`brAInwav Adaptive Coordinator: No assignments created for task ${task.id}. Check capability requirements.`,
			);
		}
	}

	private updateStrategyPerformance(
		strategy: OrchestrationStrategy,
		task: LongHorizonTask,
		performance: {
			efficiency: number;
			quality: number;
			speed: number;
			resourceUtilization: number;
		},
	): void {
		const history = this.performanceHistory.get(strategy) ?? [];
		history.push({
			efficiency: performance.efficiency,
			quality: performance.quality,
			speed: performance.speed,
			resourceUtilization: performance.resourceUtilization,
			timestamp: new Date(),
			taskId: task.id,
		});

		if (history.length > this.config.maxHistorySize) {
			history.splice(0, history.length - this.config.maxHistorySize);
		}

		this.performanceHistory.set(strategy, history);
		this.selector.updatePerformance(strategy, task, {
			efficiency: performance.efficiency,
			quality: performance.quality,
			speed: performance.speed,
		});
	}

	private calculateCapabilityMatch(agentCapabilities: string[], required: string[]): number {
		if (required.length === 0) {
			return 1;
		}

		const matches = required.filter((capability) => agentCapabilities.includes(capability));
		return matches.length / required.length;
	}

	private selectCapabilities(agentCapabilities: string[], required: string[]): string[] {
		if (required.length === 0) {
			return agentCapabilities.slice(0, 3);
		}

		const matches = required.filter((capability) => agentCapabilities.includes(capability));
		return matches.length > 0
			? matches
			: agentCapabilities.slice(0, Math.min(2, agentCapabilities.length));
	}

	private averageAssignmentConfidence(assignments: CoordinationAssignment[]): number {
		if (assignments.length === 0) {
			return 0;
		}

		const total = assignments.reduce((acc, assignment) => acc + assignment.confidence, 0);
		return total / assignments.length;
	}

	private cloneContext(context: PlanningContext): PlanningContext {
		return {
			...context,
			steps: context.steps.map((step) => ({
				...step,
				timestamp: new Date(step.timestamp),
			})),
			history: context.history.map((entry) => ({
				...entry,
				timestamp: new Date(entry.timestamp),
			})),
			metadata: {
				...context.metadata,
				createdAt: new Date(context.metadata.createdAt),
				updatedAt: new Date(context.metadata.updatedAt),
			},
			preferences: {
				...context.preferences,
				notes: [...context.preferences.notes],
			},
			compliance: {
				...context.compliance,
				lastCheckedAt: context.compliance.lastCheckedAt
					? new Date(context.compliance.lastCheckedAt)
					: null,
				outstandingViolations: context.compliance.outstandingViolations.map((violation) => ({
					...violation,
					detectedAt: new Date(violation.detectedAt),
				})),
			},
		};
	}
}
