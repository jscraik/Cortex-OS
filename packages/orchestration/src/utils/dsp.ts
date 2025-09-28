export type DSPConfig = {
	initialStep?: number;
	maxStep?: number;
	planningDepth?: number;
	contextIsolation?: boolean;
	workspaceId?: string;
};

export enum PlanningPhase {
	INITIALIZATION = 'initialization',
	ANALYSIS = 'analysis',
	STRATEGY = 'strategy',
	EXECUTION = 'execution',
	VALIDATION = 'validation',
	COMPLETION = 'completion',
}

const COMPLIANCE_RISK_ORDER: Array<'low' | 'medium' | 'high' | 'critical'> = ['low', 'medium', 'high', 'critical'];

function escalateRiskLevel(current: 'low' | 'medium' | 'high' | 'critical'): 'low' | 'medium' | 'high' | 'critical' {
        const index = COMPLIANCE_RISK_ORDER.indexOf(current);
        return COMPLIANCE_RISK_ORDER[Math.min(index + 1, COMPLIANCE_RISK_ORDER.length - 1)];
}

function reduceRiskLevel(current: 'low' | 'medium' | 'high' | 'critical'): 'low' | 'medium' | 'high' | 'critical' {
        const index = COMPLIANCE_RISK_ORDER.indexOf(current);
        return COMPLIANCE_RISK_ORDER[Math.max(index - 1, 0)];
}

export interface PlanningContext {
	id: string;
	workspaceId?: string;
	currentPhase: PlanningPhase;
	steps: Array<{
		phase: PlanningPhase;
		action: string;
		status: 'pending' | 'in_progress' | 'completed' | 'failed';
		timestamp: Date;
		result?: unknown;
	}>;
	history: Array<{
		decision: string;
		outcome: 'success' | 'failure';
		learned: string;
		timestamp: Date;
	}>;
	metadata: {
		createdBy: 'brAInwav';
		createdAt: Date;
		updatedAt: Date;
		complexity: number;
		priority: number;
		compliance: {
			riskLevel: 'low' | 'medium' | 'high' | 'critical';
			activeViolations: number;
			notes: string[];
		};
	};
	preferences: {
		failureHandling: 'strict' | 'resilient' | 'permissive';
		notes: string[];
	};
	compliance: {
		standards: string[];
		lastCheckedAt: Date | null;
		riskScore: number;
		outstandingViolations: Array<{
			id: string;
			severity: 'low' | 'medium' | 'high' | 'critical';
			description: string;
			remediation: string;
			detectedAt: Date;
		}>;
	};
}

export class DynamicSpeculativePlanner {
	private _current: number;
	private readonly max: number;
	private readonly planningDepth: number;
	private readonly contextIsolation: boolean;
	private readonly workspaceId?: string;
	private planningContext?: PlanningContext;

	constructor(config?: DSPConfig) {
		this._current = Math.max(0, Math.floor(config?.initialStep ?? 0));
		this.max = Math.max(this._current, Math.floor(config?.maxStep ?? 0));
		this.planningDepth = Math.max(1, Math.floor(config?.planningDepth ?? 3));
		this.contextIsolation = config?.contextIsolation ?? true;
		this.workspaceId = config?.workspaceId;
	}

	get currentStep(): number {
		return this._current;
	}

	get currentPhase(): PlanningPhase | undefined {
		return this.planningContext?.currentPhase;
	}

	get context(): PlanningContext | undefined {
		return this.planningContext;
	}

	update(success: boolean): void {
		if (success) {
			this._current = Math.min(this.max, this._current + 1);
		} else {
			this._current = Math.max(0, this._current - 1);
		}

		// Record outcome in planning context if available
		if (this.planningContext) {
			this.planningContext.history.push({
				decision: `Step ${this._current} ${success ? 'succeeded' : 'failed'}`,
				outcome: success ? 'success' : 'failure',
				learned: success
					? 'Complexity level appropriate, continue with current approach'
					: 'Reduce complexity or adjust strategy for better outcomes',
				timestamp: new Date(),
			});
			const compliance = this.planningContext.metadata.compliance;
			if (compliance) {
				const note = success
					? 'brAInwav compliance checkpoint succeeded.'
					: 'brAInwav compliance monitoring escalated risk.';
				if (!compliance.notes.includes(note)) {
					compliance.notes = [...compliance.notes, note];
				}
				if (success) {
					compliance.riskLevel = reduceRiskLevel(compliance.riskLevel);
					compliance.activeViolations = Math.max(0, compliance.activeViolations - 1);
				} else {
					compliance.riskLevel = escalateRiskLevel(compliance.riskLevel);
					compliance.activeViolations = Math.max(1, compliance.activeViolations + 1);
				}
			}
			this.planningContext.metadata.updatedAt = new Date();
		}
	}

	/**
	 * Initialize planning context for long-horizon tasks
	 */
	initializePlanning(
		taskId: string,
		complexity: number = 1,
		priority: number = 5,
	): PlanningContext {
		if (this.contextIsolation && this.planningContext) {
			// Context isolation: create new context
			console.log(`brAInwav DSP: Isolating context for task ${taskId}`);
		}

		this.planningContext = {
			id: taskId,
			workspaceId: this.workspaceId,
			currentPhase: PlanningPhase.INITIALIZATION,
			steps: [],
			history: [],
			metadata: {
				createdBy: 'brAInwav',
				createdAt: new Date(),
				updatedAt: new Date(),
				complexity,
				priority,
				compliance: {
					riskLevel: 'low',
					activeViolations: 0,
					notes: ['brAInwav compliance baseline: no violations detected.'],
				},
			},
			preferences: {
				failureHandling: 'resilient',
				notes: [],
			},
			compliance: {
				standards: ['OWASP Top 10', 'SOC 2', 'ISO 27001'],
				lastCheckedAt: null,
				riskScore: 0,
				outstandingViolations: [],
			},
		};

		console.log(
			`brAInwav DSP: Initialized planning context for task ${taskId} with complexity ${complexity}`,
		);
		return this.planningContext;
	}

	/**
	 * Apply compliance summary updates from security coordination
	 */
	applyComplianceSummary(summary: { riskLevel: 'low' | 'medium' | 'high' | 'critical'; activeViolations: number; notes?: string[] }): void {
		if (!this.planningContext) {
			throw new Error('brAInwav DSP: Planning context not initialized');
		}

		const compliance = this.planningContext.metadata.compliance;
		if (!compliance) {
			return;
		}

		compliance.riskLevel = summary.riskLevel;
		compliance.activeViolations = Math.max(0, summary.activeViolations);
		if (summary.notes && summary.notes.length > 0) {
			compliance.notes = summary.notes;
		}
		this.planningContext.metadata.updatedAt = new Date();
	}

	/**
	 * Advance to next planning phase
	 */
	advancePhase(action: string): void {
		if (!this.planningContext) {
			throw new Error('brAInwav DSP: Planning context not initialized');
		}

		const phases = Object.values(PlanningPhase);
		const currentIndex = phases.indexOf(this.planningContext.currentPhase);
		const nextPhase = phases[Math.min(currentIndex + 1, phases.length - 1)];

		// Mark current step as completed
		if (this.planningContext.steps.length > 0) {
			const currentStep = this.planningContext.steps[this.planningContext.steps.length - 1];
			if (currentStep.status === 'in_progress') {
				currentStep.status = 'completed';
			}
		}

		// Add new step for next phase
		this.planningContext.steps.push({
			phase: nextPhase,
			action,
			status: 'in_progress',
			timestamp: new Date(),
		});

		this.planningContext.currentPhase = nextPhase;
		this.planningContext.metadata.updatedAt = new Date();

		console.log(`brAInwav DSP: Advanced to phase ${nextPhase} with action: ${action}`);
	}

	/**
	 * Get adaptive planning depth based on task complexity
	 */
	getAdaptivePlanningDepth(): number {
		if (!this.planningContext) {
			return this.planningDepth;
		}

		const { complexity, priority } = this.planningContext.metadata;
		const baseDepth = this.planningDepth;
		const complexityMultiplier = Math.min(complexity / 5, 2); // Cap at 2x
		const priorityMultiplier = priority > 8 ? 1.5 : 1;
		const complianceRisk = this.planningContext.metadata.compliance?.riskLevel ?? 'low';
		const riskMultipliers: Record<string, number> = {
			critical: 1.75,
			high: 1.5,
			medium: 1.2,
			low: 1,
		};
		const riskMultiplier = riskMultipliers[complianceRisk] ?? 1;

		return Math.ceil(baseDepth * complexityMultiplier * priorityMultiplier * riskMultiplier);
	}

	/**
	 * Complete planning context
	 */
	completePlanning(result?: unknown): void {
		if (!this.planningContext) {
			return;
		}

		// Mark final step as completed
		if (this.planningContext.steps.length > 0) {
			const finalStep = this.planningContext.steps[this.planningContext.steps.length - 1];
			finalStep.status = 'completed';
			finalStep.result = result;
		}

		this.planningContext.currentPhase = PlanningPhase.COMPLETION;
		this.planningContext.metadata.updatedAt = new Date();

		const compliance = this.planningContext.metadata.compliance;
		if (compliance) {
			compliance.riskLevel = reduceRiskLevel(compliance.riskLevel);
			compliance.activeViolations = Math.max(0, compliance.activeViolations - 1);
			if (!compliance.notes.includes('brAInwav compliance audit completed.')) {
				compliance.notes = [...compliance.notes, 'brAInwav compliance audit completed.'];
			}
		}

		console.log(`brAInwav DSP: Completed planning for task ${this.planningContext.id}`);
	}
}

/**
 * Simulates dynamic speculative planning over a series of outcomes.
 * Returns the step used before each outcome update.
 */
export function simulateDSP(outcomes: boolean[], config?: DSPConfig): number[] {
	const planner = new DynamicSpeculativePlanner(config);
	return outcomes.map((result) => {
		const step = planner.currentStep;
		planner.update(result);
		return step;
	});
}
