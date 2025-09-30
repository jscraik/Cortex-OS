import {
	type Strategy,
	StrategySelector,
	type TaskProfile,
} from '../intelligence/strategy-selector.js';
import type { LongHorizonTask, PlanningResult } from '../lib/long-horizon-planner.js';
import { SecurityCoordinator } from '../security/security-coordinator.js';
import type { PlanningContext } from '../utils/dsp.js';

export interface AgentDescriptor {
	id: string;
	capabilities: string[];
	traits?: Record<string, unknown>;
}

export interface CoordinationRequest {
	task: LongHorizonTask;
	agents: AgentDescriptor[];
	planningResult?: PlanningResult;
	contextSnapshot?: PlanningContext;
	requiredCapabilities?: string[];
}

export interface CoordinationTelemetry {
	branding: 'brAInwav';
	timestamp: string;
	message: string;
	metadata?: Record<string, unknown>;
}

export interface CoordinationAssignment {
	agentId: string;
	role: string;
	weight: number;
}

export interface CoordinationDecision {
	taskId: string;
	strategy: Strategy;
	assignments: CoordinationAssignment[];
	confidence: number;
	telemetry: CoordinationTelemetry[];
	statePatch: Record<string, unknown>;
}

// Compatibility: some integration code expects a CoordinationResult shape
export type CoordinationResult = CoordinationDecision & { estimatedDuration?: number };

export interface CoordinationOutcome {
	taskId: string;
	strategy: Strategy;
	success: boolean;
	efficiency: number;
	quality: number;
	durationMs: number;
	timestamp: Date;
}

export interface AdaptiveCoordinationOptions {
	selector?: StrategySelector;
	clock?: () => Date;
	telemetrySink?: (telemetry: CoordinationTelemetry) => void;
	historyLimit?: number;
	securityCoordinator?: SecurityCoordinator;
}

interface HistoricalRecord {
	decision: CoordinationDecision;
	outcome?: CoordinationOutcome;
}

export class AdaptiveCoordinationManager {
	private readonly selector: StrategySelector;
	private readonly clock: () => Date;
	private readonly telemetrySink?: (telemetry: CoordinationTelemetry) => void;
	private readonly historyLimit: number;
	private readonly securityCoordinator: SecurityCoordinator;
	private readonly history = new Map<string, HistoricalRecord[]>();

	constructor(options: AdaptiveCoordinationOptions = {}) {
		this.selector = options.selector ?? new StrategySelector();
		this.clock = options.clock ?? (() => new Date());
		this.telemetrySink = options.telemetrySink;
		this.historyLimit = Math.max(1, options.historyLimit ?? 50);
		this.securityCoordinator = options.securityCoordinator ?? new SecurityCoordinator();
	}

	/**
	 * Optional integration hook used by LangGraph bridge to provide the long horizon planner
	 */
	setLongHorizonPlanner(_planner: unknown): void {
		// No-op default; planner is only used by integrations that need deeper coordination
	}

	coordinate(request: CoordinationRequest): CoordinationDecision {
		const profile = this.createProfile(request);
		const baseStrategy = this.selector.selectStrategy(profile);
		const strategy = this.adjustStrategyWithHistory(request.task.id, baseStrategy);

		const assignments = this.buildAssignments(request, strategy);
		const telemetry: CoordinationTelemetry[] = [];
		const timestamp = this.clock().toISOString();

		const confidence = this.computeConfidence(request.task.id, strategy);

		telemetry.push({
			branding: 'brAInwav',
			timestamp,
			message: `Selected ${strategy} coordination strategy for task ${request.task.id}`,
			metadata: {
				baseStrategy,
				complexity: request.task.complexity,
				priority: request.task.priority,
				agentCount: request.agents.length,
			},
		});

		telemetry.push({
			branding: 'brAInwav',
			timestamp,
			message: `Assigned ${assignments.length} agents to task ${request.task.id}`,
			metadata: {
				assignments,
			},
		});

		const securityReview = this.securityCoordinator.review({
			request,
			strategy,
			assignments,
			confidence,
			timestamp,
		});
		telemetry.push(...securityReview.telemetry);

		for (const entry of telemetry) {
			this.telemetrySink?.(entry);
			console.log(`brAInwav AdaptiveCoordinator: ${entry.message}`);
		}

		const baseStatePatch = this.createStatePatch(request, strategy, confidence);
		const statePatch = this.mergeStatePatches(baseStatePatch, securityReview.statePatch);

		const decision: CoordinationDecision = {
			taskId: request.task.id,
			strategy,
			assignments,
			confidence,
			telemetry,
			statePatch,
		};

		this.recordDecision(decision);

		return decision;
	}

	recordOutcome(outcome: CoordinationOutcome): void {
		const history = this.history.get(outcome.taskId);
		if (!history || history.length === 0) {
			return;
		}

		const latest = history[history.length - 1];
		if (latest && latest.decision.strategy === outcome.strategy && !latest.outcome) {
			latest.outcome = outcome;
		} else {
			console.warn(
				`AdaptiveCoordinator: Attempted to record outcome for task '${outcome.taskId}' with strategy '${outcome.strategy}', but no corresponding decision was found in history. Outcome not recorded.`,
			);
			return;
		}

		this.trimHistory(outcome.taskId);
	}

	getHistory(taskId: string): HistoricalRecord[] {
		return (this.history.get(taskId) ?? []).map((record) => ({
			decision: {
				...record.decision,
				telemetry: record.decision.telemetry.map((entry) => ({
					...entry,
					timestamp: entry.timestamp,
				})),
				assignments: record.decision.assignments.map((assignment) => ({ ...assignment })),
				statePatch: { ...record.decision.statePatch },
			},
			outcome: record.outcome
				? { ...record.outcome, timestamp: new Date(record.outcome.timestamp) }
				: undefined,
		}));
	}

	private createProfile(request: CoordinationRequest): TaskProfile {
		const aggregatedBranches = Math.max(1, request.task.dependencies.length || 1);
		const aggregatedDataSize =
			request.planningResult?.phases.reduce((acc, phase) => acc + phase.duration, 0) ??
			request.task.estimatedDuration;

		return {
			description: request.task.description,
			complexity: Math.min(1, request.task.complexity / 10),
			canParallelize: request.agents.length > 1,
			estimatedBranches: aggregatedBranches,
			dataSize: Math.max(100, aggregatedDataSize),
		};
	}

	private adjustStrategyWithHistory(taskId: string, strategy: Strategy): Strategy {
		const history = this.history.get(taskId);
		if (!history || history.length < 2) {
			return strategy;
		}

		const [previous, beforePrevious] = history.slice(-2);
		if (previous.outcome?.success === false && beforePrevious?.outcome?.success === false) {
			return 'sequential-safe';
		}

		if (previous.outcome?.success === false && strategy === previous.decision.strategy) {
			return 'hybrid';
		}

		return strategy;
	}

	private buildAssignments(
		request: CoordinationRequest,
		strategy: Strategy,
	): CoordinationAssignment[] {
		const required = request.requiredCapabilities ?? [];
		const eligibleAgents = required.length
			? request.agents.filter((agent) => required.every((cap) => agent.capabilities.includes(cap)))
			: request.agents;

		const selected =
			strategy === 'parallel-coordinated' || strategy === 'hybrid'
				? eligibleAgents.slice(0, Math.max(2, eligibleAgents.length))
				: eligibleAgents.slice(0, 1);

		return selected.map((agent, index) => ({
			agentId: agent.id,
			role: required[index] ?? 'generalist',
			weight: strategy === 'sequential-safe' ? 1 : 1 / selected.length,
		}));
	}

	private computeConfidence(taskId: string, strategy: Strategy): number {
		const history = this.history.get(taskId);
		if (!history || history.length === 0) {
			return 0.65;
		}

		const relevant = history.filter(
			(record) => record.decision.strategy === strategy && record.outcome,
		);
		if (relevant.length === 0) {
			return 0.7;
		}

		const successRate =
			relevant.filter((record) => record.outcome?.success).length / Math.max(1, relevant.length);
		const averageQuality =
			relevant.reduce((acc, record) => acc + (record.outcome?.quality ?? 0), 0) /
			Math.max(1, relevant.length);

		return Math.min(0.95, 0.5 + successRate * 0.3 + averageQuality * 0.2);
	}

	private createStatePatch(
		request: CoordinationRequest,
		strategy: Strategy,
		confidence: number,
	): Record<string, unknown> {
		return {
			planning: {
				taskId: request.task.id,
				strategy,
				confidence,
				phases: request.planningResult?.phases ?? [],
			},
			coordination: {
				agents: request.agents.map((agent) => agent.id),
				requiredCapabilities: request.requiredCapabilities ?? [],
			},
		};
	}

	private recordDecision(decision: CoordinationDecision): void {
		const history = this.history.get(decision.taskId) ?? [];
		history.push({ decision });
		this.history.set(decision.taskId, history);
		this.trimHistory(decision.taskId);
	}

	private trimHistory(taskId: string): void {
		const history = this.history.get(taskId);
		if (!history) {
			return;
		}

		if (history.length > this.historyLimit) {
			history.splice(0, history.length - this.historyLimit);
		}
	}

	private mergeStatePatches(
		...patches: Array<Record<string, unknown> | undefined>
	): Record<string, unknown> {
		const merged: Record<string, unknown> = {};

		for (const patch of patches) {
			if (!this.isPlainRecord(patch)) {
				continue;
			}

			for (const [key, value] of Object.entries(patch)) {
				const current = merged[key];

				merged[key] = this.mergeValues(current, value);
			}
		}

		return merged;
	}

	// Helper to centralize value merging logic and reduce cognitive complexity of the main loop
	private mergeValues(current: unknown, value: unknown): unknown {
		if (this.isPlainRecord(current) && this.isPlainRecord(value)) {
			return this.mergeStatePatches(current, value);
		}

		if (Array.isArray(current) && Array.isArray(value)) {
			return [...current, ...value];
		}

		// If incoming value is explicitly undefined, keep current value
		if (value === undefined) return current;

		return value;
	}

	private isPlainRecord(candidate: unknown): candidate is Record<string, unknown> {
		if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
			return false;
		}

		let prototype;
		try {
			prototype = Object.getPrototypeOf(candidate);
		} catch {
			return false;
		}
		return prototype === Object.prototype || prototype === null;
	}
}
