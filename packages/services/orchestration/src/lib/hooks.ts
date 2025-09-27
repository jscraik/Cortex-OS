/**
 * Hooks system for orchestration workflows
 * Provides pre/post execution hooks for steps and workflow lifecycle events
 */

export interface HookContext {
	stepId: string;
	workflowId?: string;
	signal?: AbortSignal;
	metadata?: Record<string, unknown>;
}

export interface WorkflowHookContext {
	workflowId: string;
	signal?: AbortSignal;
	metadata?: Record<string, unknown>;
}

export type HookFn = (ctx: HookContext) => Promise<void> | void;
export type WorkflowHookFn = (ctx: WorkflowHookContext) => Promise<void> | void;

export interface HookRegistry {
	// Step-level hooks
	preStep: Map<string, HookFn[]>;
	postStep: Map<string, HookFn[]>;
	onStepError: Map<string, HookFn[]>;

	// Global step hooks (apply to all steps)
	globalPreStep: HookFn[];
	globalPostStep: HookFn[];
	globalOnStepError: HookFn[];

	// Workflow-level hooks
	preWorkflow: WorkflowHookFn[];
	postWorkflow: WorkflowHookFn[];
	onWorkflowError: WorkflowHookFn[];

	// Cancellation/cleanup hooks
	onWorkflowCancelled: WorkflowHookFn[];
	onStepCancelled: Map<string, HookFn[]>;
	globalOnStepCancelled: HookFn[];
}

export function createHookRegistry(): HookRegistry {
	return {
		preStep: new Map(),
		postStep: new Map(),
		onStepError: new Map(),
		globalPreStep: [],
		globalPostStep: [],
		globalOnStepError: [],
		preWorkflow: [],
		postWorkflow: [],
		onWorkflowError: [],
		onWorkflowCancelled: [],
		onStepCancelled: new Map(),
		globalOnStepCancelled: [],
	};
}

export class HookManager {
	private registry: HookRegistry;

	constructor(registry: HookRegistry = createHookRegistry()) {
		this.registry = registry;
	}

	// Step-level hook registration
	addPreStepHook(stepId: string, hook: HookFn): void {
		if (!this.registry.preStep.has(stepId)) {
			this.registry.preStep.set(stepId, []);
		}
		const hooks = this.registry.preStep.get(stepId);
		if (hooks) {
			hooks.push(hook);
		}
	}

	addPostStepHook(stepId: string, hook: HookFn): void {
		if (!this.registry.postStep.has(stepId)) {
			this.registry.postStep.set(stepId, []);
		}
		const hooks = this.registry.postStep.get(stepId);
		if (hooks) {
			hooks.push(hook);
		}
	}

	addStepErrorHook(stepId: string, hook: HookFn): void {
		if (!this.registry.onStepError.has(stepId)) {
			this.registry.onStepError.set(stepId, []);
		}
		const hooks = this.registry.onStepError.get(stepId);
		if (hooks) {
			hooks.push(hook);
		}
	}

	// Global step hooks
	addGlobalPreStepHook(hook: HookFn): void {
		this.registry.globalPreStep.push(hook);
	}

	addGlobalPostStepHook(hook: HookFn): void {
		this.registry.globalPostStep.push(hook);
	}

	addGlobalStepErrorHook(hook: HookFn): void {
		this.registry.globalOnStepError.push(hook);
	}

	// Workflow-level hooks
	addPreWorkflowHook(hook: WorkflowHookFn): void {
		this.registry.preWorkflow.push(hook);
	}

	addPostWorkflowHook(hook: WorkflowHookFn): void {
		this.registry.postWorkflow.push(hook);
	}

	addWorkflowErrorHook(hook: WorkflowHookFn): void {
		this.registry.onWorkflowError.push(hook);
	}

	// Cancellation/cleanup hooks
	addWorkflowCancelledHook(hook: WorkflowHookFn): void {
		this.registry.onWorkflowCancelled.push(hook);
	}

	addStepCancelledHook(stepId: string, hook: HookFn): void {
		if (!this.registry.onStepCancelled.has(stepId)) {
			this.registry.onStepCancelled.set(stepId, []);
		}
		const hooks = this.registry.onStepCancelled.get(stepId);
		if (hooks) {
			hooks.push(hook);
		}
	}

	addGlobalStepCancelledHook(hook: HookFn): void {
		this.registry.globalOnStepCancelled.push(hook);
	}

	// Hook execution methods
	async executePreStepHooks(ctx: HookContext): Promise<void> {
		// Execute global pre-step hooks
		await this.executeHooks(this.registry.globalPreStep, ctx);

		// Execute step-specific pre-step hooks
		const stepHooks = this.registry.preStep.get(ctx.stepId) || [];
		await this.executeHooks(stepHooks, ctx);
	}

	async executePostStepHooks(ctx: HookContext): Promise<void> {
		// Execute step-specific post-step hooks
		const stepHooks = this.registry.postStep.get(ctx.stepId) || [];
		await this.executeHooks(stepHooks, ctx);

		// Execute global post-step hooks
		await this.executeHooks(this.registry.globalPostStep, ctx);
	}

	async executeStepErrorHooks(ctx: HookContext): Promise<void> {
		// Execute step-specific error hooks
		const stepHooks = this.registry.onStepError.get(ctx.stepId) || [];
		await this.executeHooks(stepHooks, ctx);

		// Execute global error hooks
		await this.executeHooks(this.registry.globalOnStepError, ctx);
	}

	async executePreWorkflowHooks(ctx: WorkflowHookContext): Promise<void> {
		await this.executeWorkflowHooks(this.registry.preWorkflow, ctx);
	}

	async executePostWorkflowHooks(ctx: WorkflowHookContext): Promise<void> {
		await this.executeWorkflowHooks(this.registry.postWorkflow, ctx);
	}

	async executeWorkflowErrorHooks(ctx: WorkflowHookContext): Promise<void> {
		await this.executeWorkflowHooks(this.registry.onWorkflowError, ctx);
	}

	async executeWorkflowCancelledHooks(ctx: WorkflowHookContext): Promise<void> {
		await this.executeWorkflowHooks(this.registry.onWorkflowCancelled, ctx);
	}

	async executeStepCancelledHooks(ctx: HookContext): Promise<void> {
		// Execute global step cancelled hooks
		await this.executeHooks(this.registry.globalOnStepCancelled, ctx);

		// Execute step-specific cancelled hooks
		const stepHooks = this.registry.onStepCancelled.get(ctx.stepId);
		if (stepHooks) {
			await this.executeHooks(stepHooks, ctx);
		}
	}

	private async executeHooks(hooks: HookFn[], ctx: HookContext): Promise<void> {
		if (ctx.signal?.aborted) return;

		for (const hook of hooks) {
			try {
				await hook(ctx);
			} catch (error) {
				// Log hook errors but don't fail the workflow
				console.warn(`brAInwav hook execution failed for step ${ctx.stepId}:`, error);
			}
		}
	}

	private async executeWorkflowHooks(
		hooks: WorkflowHookFn[],
		ctx: WorkflowHookContext,
	): Promise<void> {
		if (ctx.signal?.aborted) return;

		for (const hook of hooks) {
			try {
				await hook(ctx);
			} catch (error) {
				// Log hook errors but don't fail the workflow
				console.warn(
					`brAInwav workflow hook execution failed for workflow ${ctx.workflowId}:`,
					error,
				);
			}
		}
	}

	// Utility methods
	removeStepHooks(stepId: string): void {
		this.registry.preStep.delete(stepId);
		this.registry.postStep.delete(stepId);
		this.registry.onStepError.delete(stepId);
	}

	clearGlobalHooks(): void {
		this.registry.globalPreStep.length = 0;
		this.registry.globalPostStep.length = 0;
		this.registry.globalOnStepError.length = 0;
	}

	clearWorkflowHooks(): void {
		this.registry.preWorkflow.length = 0;
		this.registry.postWorkflow.length = 0;
		this.registry.onWorkflowError.length = 0;
	}

	clearAllHooks(): void {
		this.registry.preStep.clear();
		this.registry.postStep.clear();
		this.registry.onStepError.clear();
		this.clearGlobalHooks();
		this.clearWorkflowHooks();
	}
}

// Common hook implementations
export const commonHooks = {
	// Logging hooks
	logStepStart: (ctx: HookContext) => {
		const metadata = { brand: 'brAInwav', ...(ctx.metadata ?? {}) };
		console.warn(`brAInwav starting step: ${ctx.stepId}`, metadata);
	},

	logStepComplete: (ctx: HookContext) => {
		const metadata = { brand: 'brAInwav', ...(ctx.metadata ?? {}) };
		console.warn(`brAInwav completed step: ${ctx.stepId}`, metadata);
	},

	logStepError: (ctx: HookContext) => {
		const metadata = { brand: 'brAInwav', ...(ctx.metadata ?? {}) };
		console.error(`brAInwav error in step: ${ctx.stepId}`, metadata);
	},

	// Metrics hooks
	recordStepMetrics: (ctx: HookContext) => {
		// Implementation would integrate with actual metrics system
		const timestamp = Date.now();
		console.warn(`brAInwav metrics: step=${ctx.stepId}, timestamp=${timestamp}`);
	},

	// Validation hooks
	validateStepPreconditions: (ctx: HookContext) => {
		// Custom validation logic would go here
		if (ctx.signal?.aborted) {
			throw new Error(`brAInwav step ${ctx.stepId} aborted during precondition check`);
		}
	},
};
