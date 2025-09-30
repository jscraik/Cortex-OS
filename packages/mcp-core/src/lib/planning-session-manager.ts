export enum PlanningPhase {
	INITIALIZATION = 'initialization',
	ANALYSIS = 'analysis',
	STRATEGY = 'strategy',
	EXECUTION = 'execution',
	VALIDATION = 'validation',
	COMPLETION = 'completion',
}

export interface PlanningStep {
	readonly phase: PlanningPhase;
	readonly action: string;
	readonly status: 'pending' | 'in_progress' | 'completed' | 'failed';
	readonly timestamp: Date;
	readonly result?: unknown;
}

export interface PlanningHistoryEntry {
	readonly decision: string;
	readonly outcome: 'success' | 'failure';
	readonly learned: string;
	readonly timestamp: Date;
}

export interface PlanningContextMetadata {
	readonly createdBy: 'brAInwav';
	readonly createdAt: Date;
	readonly updatedAt: Date;
	readonly complexity: number;
	readonly priority: number;
}

export interface PlanningContext {
	readonly id: string;
	readonly workspaceId?: string;
	readonly currentPhase: PlanningPhase;
	readonly steps: PlanningStep[];
	readonly history: PlanningHistoryEntry[];
	readonly metadata: PlanningContextMetadata;
}

export interface PlanningTask {
	readonly id: string;
	readonly description: string;
	readonly complexity: number;
	readonly priority: number;
	readonly estimatedDuration: number;
	readonly dependencies: string[];
	readonly metadata: Record<string, unknown>;
}

export interface PlanningSessionManagerOptions {
	readonly maxSessions?: number;
	readonly historyLimit?: number;
}

export class PlanningSessionManager {
	private readonly contexts = new Map<string, PlanningContext>();
	private readonly maxSessions: number;
	private readonly historyLimit: number;

	constructor(options: PlanningSessionManagerOptions = {}) {
		this.maxSessions = options.maxSessions ?? 100;
		this.historyLimit = options.historyLimit ?? 50;
	}

	saveContext(context: PlanningContext): PlanningContext {
		const limitedContext = this.applyLimits(context);
		this.contexts.set(context.id, limitedContext);
		this.enforceSessionLimit();
		return limitedContext;
	}

	getContext(sessionId: string): PlanningContext | undefined {
		return this.contexts.get(sessionId);
	}

	deleteContext(sessionId: string): boolean {
		return this.contexts.delete(sessionId);
	}

	listContexts(): PlanningContext[] {
		return Array.from(this.contexts.values());
	}

	reset(): void {
		this.contexts.clear();
	}

	private applyLimits(context: PlanningContext): PlanningContext {
		const limitedSteps = context.steps.slice(-this.historyLimit);
		const limitedHistory = context.history.slice(-this.historyLimit);

		return {
			...context,
			steps: limitedSteps,
			history: limitedHistory,
		};
	}

	private enforceSessionLimit(): void {
		while (this.contexts.size > this.maxSessions) {
			const oldestKey = this.contexts.keys().next().value as string | undefined;
			if (!oldestKey) break;
			this.contexts.delete(oldestKey);
		}
	}
}
