import { StrategySelector } from '../intelligence/strategy-selector.js';
import { SecurityCoordinator } from '../security/security-coordinator.js';
export class AdaptiveCoordinationManager {
	selector;
	clock;
	telemetrySink;
	historyLimit;
	securityCoordinator;
	history = new Map();
	constructor(options = {}) {
		this.selector = options.selector ?? new StrategySelector();
		this.clock = options.clock ?? (() => new Date());
		this.telemetrySink = options.telemetrySink;
		this.historyLimit = Math.max(1, options.historyLimit ?? 50);
		this.securityCoordinator = options.securityCoordinator ?? new SecurityCoordinator();
	}
	/**
	 * Optional integration hook used by LangGraph bridge to provide the long horizon planner
	 */
	setLongHorizonPlanner(_planner) {
		// No-op default; planner is only used by integrations that need deeper coordination
	}
	coordinate(request) {
		const profile = this.createProfile(request);
		const baseStrategy = this.selector.selectStrategy(profile);
		const strategy = this.adjustStrategyWithHistory(request.task.id, baseStrategy);
		const assignments = this.buildAssignments(request, strategy);
		const telemetry = [];
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
		const decision = {
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
	recordOutcome(outcome) {
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
	getHistory(taskId) {
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
	createProfile(request) {
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
	adjustStrategyWithHistory(taskId, strategy) {
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
	buildAssignments(request, strategy) {
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
	computeConfidence(taskId, strategy) {
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
	createStatePatch(request, strategy, confidence) {
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
	recordDecision(decision) {
		const history = this.history.get(decision.taskId) ?? [];
		history.push({ decision });
		this.history.set(decision.taskId, history);
		this.trimHistory(decision.taskId);
	}
	trimHistory(taskId) {
		const history = this.history.get(taskId);
		if (!history) {
			return;
		}
		if (history.length > this.historyLimit) {
			history.splice(0, history.length - this.historyLimit);
		}
	}
	mergeStatePatches(...patches) {
		const merged = {};
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
	mergeValues(current, value) {
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
	isPlainRecord(candidate) {
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
//# sourceMappingURL=adaptive-coordinator.js.map
