import { PlanningPhase } from '../types.js';

export { PlanningPhase } from '../types.js';
export class DynamicSpeculativePlanner {
	_current;
	max;
	planningDepth;
	contextIsolation;
	workspaceId;
	autoPersist;
	resumeFromPersistence;
	isolationOptions;
	persistenceAdapter;
	isolationStrategy;
	isolationScope;
	planningContext;
	revision = 0;
	lastSnapshot;
	constructor(config) {
		this._current = Math.max(0, Math.floor(config?.initialStep ?? 0));
		this.max = Math.max(this._current, Math.floor(config?.maxStep ?? 0));
		this.planningDepth = Math.max(1, Math.floor(config?.planningDepth ?? 3));
		this.contextIsolation = config?.contextIsolation ?? true;
		this.workspaceId = config?.workspaceId;
		this.persistenceAdapter = config?.persistenceAdapter;
		this.autoPersist = config?.autoPersist ?? Boolean(this.persistenceAdapter);
		this.resumeFromPersistence = config?.resumeFromPersistence ?? Boolean(this.persistenceAdapter);
		this.isolationStrategy = config?.isolationStrategy;
		this.isolationOptions = config?.isolationOptions;
		this.isolationScope = this.isolationOptions?.scope ?? 'task';
	}
	get currentStep() {
		return this._current;
	}
	get currentPhase() {
		return this.planningContext?.currentPhase;
	}
	get context() {
		return this.planningContext;
	}
	get lastKnownSnapshot() {
		if (!this.lastSnapshot) {
			return undefined;
		}
		return {
			...this.lastSnapshot,
			timestamp: new Date(this.lastSnapshot.timestamp),
			context: this.cloneContext(this.lastSnapshot.context),
		};
	}
	update(success) {
		if (success) {
			this._current = Math.min(this.max, this._current + 1);
		} else {
			this._current = Math.max(0, this._current - 1);
		}
		if (!this.planningContext) {
			return;
		}
		this.planningContext.history.push({
			decision: `Step ${this._current} ${success ? 'succeeded' : 'failed'}`,
			outcome: success ? 'success' : 'failure',
			learned: success
				? 'Complexity level appropriate, continue with current approach'
				: 'Reduce complexity or adjust strategy for better outcomes',
			timestamp: new Date(),
		});
		this.planningContext.metadata.updatedAt = new Date();
		this.finalizeContext('update');
	}
	initializePlanning(taskId, complexity = 1, priority = 5) {
		if (this.resumeFromPersistence && this.persistenceAdapter) {
			const resumed = this.resumePlanning(taskId, { complexity, priority });
			if (resumed) {
				return resumed;
			}
		}
		if (this.contextIsolation && this.planningContext) {
			console.log(`brAInwav DSP: Isolating context for task ${taskId}`);
		}
		const context = this.applyIsolation(
			this.createNewContext(taskId, complexity, priority),
			this.isolationOptions,
		);
		this.planningContext = context;
		console.log(
			`brAInwav DSP: Initialized planning context for task ${taskId} with complexity ${complexity}`,
		);
		this.finalizeContext('initialize');
		return context;
	}
	advancePhase(action) {
		if (!this.planningContext) {
			throw new Error('brAInwav DSP: Planning context not initialized');
		}
		const phases = Object.values(PlanningPhase);
		const currentIndex = phases.indexOf(this.planningContext.currentPhase);
		const nextPhase = phases[Math.min(currentIndex + 1, phases.length - 1)];
		if (this.planningContext.steps.length > 0) {
			const currentStep = this.planningContext.steps[this.planningContext.steps.length - 1];
			if (currentStep.status === 'in_progress') {
				currentStep.status = 'completed';
			}
		}
		this.planningContext.steps.push({
			phase: nextPhase,
			action,
			status: 'in_progress',
			timestamp: new Date(),
		});
		this.planningContext.currentPhase = nextPhase;
		this.planningContext.metadata.updatedAt = new Date();
		console.log(`brAInwav DSP: Advanced to phase ${nextPhase} with action: ${action}`);
		this.finalizeContext('phase_advance');
	}
	getAdaptivePlanningDepth() {
		if (!this.planningContext) {
			return this.planningDepth;
		}
		const { complexity, priority } = this.planningContext.metadata;
		const baseDepth = this.planningDepth;
		const complexityMultiplier = Math.min(complexity / 5, 2);
		const priorityMultiplier = priority > 8 ? 1.5 : 1;
		return Math.min(15, Math.ceil(baseDepth * complexityMultiplier * priorityMultiplier));
	}
	completePlanning(result) {
		if (!this.planningContext) {
			return;
		}
		if (this.planningContext.steps.length > 0) {
			const finalStep = this.planningContext.steps[this.planningContext.steps.length - 1];
			finalStep.status = 'completed';
			finalStep.result = result;
		}
		this.planningContext.currentPhase = PlanningPhase.COMPLETION;
		this.planningContext.metadata.updatedAt = new Date();
		console.log(`brAInwav DSP: Completed planning for task ${this.planningContext.id}`);
		this.finalizeContext('complete');
	}
	resumePlanning(taskId, overrides = {}) {
		if (!this.persistenceAdapter) {
			return undefined;
		}
		const snapshot = this.persistenceAdapter.load(taskId, this.workspaceId);
		if (!snapshot) {
			return undefined;
		}
		const prepared = this.prepareContext(snapshot.context, overrides);
		const isolated = this.applyIsolation(prepared, this.isolationOptions);
		this.planningContext = isolated;
		this.revision = snapshot.revision;
		this._current = snapshot.currentStep;
		this.lastSnapshot = {
			...snapshot,
			timestamp: new Date(snapshot.timestamp),
			context: this.cloneContext(snapshot.context),
		};
		console.log(
			`brAInwav DSP: Resumed persisted planning context for task ${taskId} at revision ${snapshot.revision}`,
		);
		return isolated;
	}
	attachContext(context, options = {}) {
		const prepared = this.prepareContext(context);
		const isolated = this.applyIsolation(prepared, options.isolationOptions);
		this.planningContext = isolated;
		if (typeof options.currentStep === 'number' && Number.isFinite(options.currentStep)) {
			const normalized = Math.floor(options.currentStep);
			this._current = Math.min(this.max, Math.max(0, normalized));
		}
		if (!options.preserveRevision) {
			this.finalizeContext(options.reason ?? 'attach', options.persist === true);
		} else if (options.persist) {
			this.persistContext(options.reason ?? 'attach', true);
		}
		return isolated;
	}
	clearContext() {
		if (this.planningContext) {
			this.isolationStrategy?.release?.(this.planningContext.id);
		}
		this.planningContext = undefined;
		this.lastSnapshot = undefined;
		console.log('brAInwav DSP: Cleared planning context state');
	}
	getContextSnapshot(reason) {
		if (!this.planningContext) {
			return undefined;
		}
		return this.createSnapshot(reason);
	}
	getLastSnapshot() {
		return this.lastKnownSnapshot;
	}
	peekPersistedContext(taskId) {
		if (!this.persistenceAdapter) {
			return undefined;
		}
		const snapshot = this.persistenceAdapter.load(taskId, this.workspaceId);
		if (!snapshot) {
			return undefined;
		}
		return {
			...snapshot,
			timestamp: new Date(snapshot.timestamp),
			context: this.cloneContext(snapshot.context),
		};
	}
	finalizeContext(reason, forcePersist = false) {
		if (!this.planningContext) {
			return;
		}
		this.bumpRevision();
		this.persistContext(reason, forcePersist);
	}
	createNewContext(taskId, complexity, priority) {
		const now = new Date();
		return {
			id: taskId,
			workspaceId: this.workspaceId,
			currentPhase: PlanningPhase.INITIALIZATION,
			steps: [],
			history: [],
			metadata: {
				createdBy: 'brAInwav',
				createdAt: now,
				updatedAt: now,
				complexity,
				priority,
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
			retention: {
				ttlMs: undefined,
				persist: this.autoPersist,
			},
		};
	}
	prepareContext(context, overrides = {}) {
		const prepared = this.cloneContext(context);
		if (typeof overrides.complexity === 'number' && Number.isFinite(overrides.complexity)) {
			prepared.metadata.complexity = overrides.complexity;
		}
		if (typeof overrides.priority === 'number' && Number.isFinite(overrides.priority)) {
			prepared.metadata.priority = overrides.priority;
		}
		prepared.metadata.updatedAt = new Date();
		return prepared;
	}
	applyIsolation(context, options) {
		if (!this.contextIsolation) {
			return context;
		}
		const merged = {
			scope: options?.scope ?? this.isolationScope,
			preserveHistory: options?.preserveHistory ?? true,
			tags: options?.tags,
		};
		if (this.isolationStrategy) {
			return this.isolationStrategy.isolate(this.cloneContext(context), merged);
		}
		return this.cloneContext(context);
	}
	bumpRevision() {
		this.revision = Math.max(this.revision + 1, 1);
	}
	persistContext(reason, force = false) {
		if (!this.planningContext) {
			return;
		}
		const snapshot = this.createSnapshot(reason);
		this.lastSnapshot = snapshot;
		if (this.persistenceAdapter && (this.autoPersist || force)) {
			this.persistenceAdapter.save(snapshot);
		}
	}
	createSnapshot(reason) {
		if (!this.planningContext) {
			throw new Error('brAInwav DSP: Cannot snapshot without active context');
		}
		return {
			id: `${this.planningContext.id}::${this.revision}`,
			taskId: this.planningContext.id,
			workspaceId: this.planningContext.workspaceId,
			revision: this.revision,
			timestamp: new Date(),
			phase: this.planningContext.currentPhase,
			scope: this.contextIsolation ? this.isolationScope : 'global',
			currentStep: this._current,
			context: this.cloneContext(this.planningContext),
			reason,
		};
	}
	cloneContext(context) {
		if (typeof structuredClone === 'function') {
			return structuredClone(context);
		}
		return JSON.parse(JSON.stringify(context, jsonDateReplacer), jsonDateReviver);
	}
}
function jsonDateReplacer(_key, value) {
	if (value instanceof Date) {
		return value.toISOString();
	}
	return value;
}
function jsonDateReviver(_key, value) {
	if (typeof value === 'string') {
		const timestamp = Date.parse(value);
		if (!Number.isNaN(timestamp)) {
			return new Date(value);
		}
	}
	return value;
}
export function simulateDSP(outcomes, config) {
	const planner = new DynamicSpeculativePlanner(config);
	return outcomes.map((result) => {
		const step = planner.currentStep;
		planner.update(result);
		return step;
	});
}
//# sourceMappingURL=dsp.js.map
