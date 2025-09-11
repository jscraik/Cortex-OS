/**
 * Compensation framework for orchestration workflows
 * Provides rollback mechanisms for failed operations using the saga pattern
 */

export interface CompensationContext {
    stepId: string;
    workflowId?: string;
    signal?: AbortSignal;
    metadata?: Record<string, unknown>;
    error?: unknown;
}

export type CompensationFn = (ctx: CompensationContext) => Promise<void> | void;

export interface CompensationAction {
    stepId: string;
    compensationFn: CompensationFn;
    metadata?: Record<string, unknown>;
    executedAt: Date;
}

export interface CompensationRegistry {
    // Mapping from step ID to compensation function
    compensations: Map<string, CompensationFn>;

    // Global compensation hooks
    onCompensationStart: ((ctx: CompensationContext) => Promise<void> | void)[];
    onCompensationComplete: ((ctx: CompensationContext) => Promise<void> | void)[];
    onCompensationError: ((ctx: CompensationContext) => Promise<void> | void)[];
}

export function createCompensationRegistry(): CompensationRegistry {
    return {
        compensations: new Map(),
        onCompensationStart: [],
        onCompensationComplete: [],
        onCompensationError: [],
    };
}

export class CompensationManager {
    private registry: CompensationRegistry;
    private executionStack: CompensationAction[] = [];

    constructor(registry: CompensationRegistry = createCompensationRegistry()) {
        this.registry = registry;
    }

    // Register compensation functions
    registerCompensation(stepId: string, compensationFn: CompensationFn): void {
        this.registry.compensations.set(stepId, compensationFn);
    }

    // Register compensation hooks
    addCompensationStartHook(hook: (ctx: CompensationContext) => Promise<void> | void): void {
        this.registry.onCompensationStart.push(hook);
    }

    addCompensationCompleteHook(hook: (ctx: CompensationContext) => Promise<void> | void): void {
        this.registry.onCompensationComplete.push(hook);
    }

    addCompensationErrorHook(hook: (ctx: CompensationContext) => Promise<void> | void): void {
        this.registry.onCompensationError.push(hook);
    }

    // Track executed steps for potential compensation
    trackExecution(stepId: string, metadata?: Record<string, unknown>): void {
        const compensationFn = this.registry.compensations.get(stepId);
        if (compensationFn) {
            this.executionStack.push({
                stepId,
                compensationFn,
                metadata,
                executedAt: new Date(),
            });
        }
    }

    // Execute compensations in reverse order (LIFO)
    async compensate(
        context: {
            workflowId?: string;
            signal?: AbortSignal;
            error?: unknown;
        } = {}
    ): Promise<CompensationResult> {
        const compensationErrors: CompensationError[] = [];
        const compensatedSteps: string[] = [];

        // Execute compensations in reverse order
        while (this.executionStack.length > 0) {
            const action = this.executionStack.pop();
            if (!action) break;

            if (context.signal?.aborted) {
                break;
            }

            const compensationContext: CompensationContext = {
                stepId: action.stepId,
                workflowId: context.workflowId,
                signal: context.signal,
                metadata: action.metadata,
                error: context.error,
            };

            try {
                // Execute compensation start hooks
                await this.executeHooks(this.registry.onCompensationStart, compensationContext);

                // Execute the compensation
                await action.compensationFn(compensationContext);

                // Execute compensation complete hooks
                await this.executeHooks(this.registry.onCompensationComplete, compensationContext);

                compensatedSteps.push(action.stepId);
            } catch (compensationError) {
                const error: CompensationError = {
                    stepId: action.stepId,
                    error: compensationError,
                    timestamp: new Date(),
                };
                compensationErrors.push(error);

                // Execute compensation error hooks
                try {
                    await this.executeHooks(this.registry.onCompensationError, {
                        ...compensationContext,
                        error: compensationError,
                    });
                } catch (hookError) {
                    console.error(`Compensation error hook failed for step ${action.stepId}:`, hookError);
                }
            }
        }

        return {
            compensatedSteps,
            errors: compensationErrors,
            isComplete: compensationErrors.length === 0,
        };
    }

    // Clear the execution stack (use after successful workflow completion)
    clearExecutionStack(): void {
        this.executionStack.length = 0;
    }

    // Get current execution stack for inspection
    getExecutionStack(): readonly CompensationAction[] {
        return [...this.executionStack];
    }

    // Remove a specific compensation registration
    unregisterCompensation(stepId: string): boolean {
        return this.registry.compensations.delete(stepId);
    }

    // Check if a step has compensation registered
    hasCompensation(stepId: string): boolean {
        return this.registry.compensations.has(stepId);
    }

    private async executeHooks(
        hooks: ((ctx: CompensationContext) => Promise<void> | void)[],
        ctx: CompensationContext
    ): Promise<void> {
        for (const hook of hooks) {
            try {
                await hook(ctx);
            } catch (error) {
                console.warn(`Compensation hook failed for step ${ctx.stepId}:`, error);
            }
        }
    }
}

export interface CompensationError {
    stepId: string;
    error: unknown;
    timestamp: Date;
}

export interface CompensationResult {
    compensatedSteps: string[];
    errors: CompensationError[];
    isComplete: boolean;
}

// Saga pattern implementation for workflows
export class SagaManager {
    private compensationManager: CompensationManager;
    private isCompensating = false;

    constructor(compensationManager?: CompensationManager) {
        this.compensationManager = compensationManager || new CompensationManager();
    }

    // Execute a step with automatic compensation tracking
    async executeStep<T>(
        stepId: string,
        stepFn: () => Promise<T>,
        compensationFn?: CompensationFn,
        metadata?: Record<string, unknown>
    ): Promise<T> {
        if (this.isCompensating) {
            throw new Error('Cannot execute steps during compensation');
        }

        // Register compensation if provided
        if (compensationFn) {
            this.compensationManager.registerCompensation(stepId, compensationFn);
        }

        try {
            const result = await stepFn();

            // Track successful execution for potential compensation
            this.compensationManager.trackExecution(stepId, metadata);

            return result;
        } catch (error) {
            // If step fails, trigger compensation
            await this.startCompensation({ error });
            throw error;
        }
    }

    // Start compensation process
    async startCompensation(context: {
        workflowId?: string;
        signal?: AbortSignal;
        error?: unknown;
    } = {}): Promise<CompensationResult> {
        if (this.isCompensating) {
            throw new Error('Compensation already in progress');
        }

        this.isCompensating = true;
        try {
            return await this.compensationManager.compensate(context);
        } finally {
            this.isCompensating = false;
        }
    }

    // Complete the saga successfully (clears compensation stack)
    complete(): void {
        if (this.isCompensating) {
            throw new Error('Cannot complete saga during compensation');
        }
        this.compensationManager.clearExecutionStack();
    }

    // Get the compensation manager for advanced operations
    getCompensationManager(): CompensationManager {
        return this.compensationManager;
    }

    // Check if currently compensating
    isInCompensation(): boolean {
        return this.isCompensating;
    }
}

// Common compensation patterns
export const compensationPatterns = {
    // Database transaction rollback
    databaseRollback: (transactionId: string) => async (ctx: CompensationContext) => {
        console.warn(`Rolling back database transaction: ${transactionId} for step: ${ctx.stepId}`);
        // Implementation would call actual database rollback
    },

    // File system cleanup
    cleanupFiles: (filePaths: string[]) => async (ctx: CompensationContext) => {
        console.warn(`Cleaning up files for step: ${ctx.stepId}`, filePaths);
        // Implementation would delete/restore files
    },

    // API call reversal
    reverseApiCall: (revertFn: () => Promise<void>) => async (ctx: CompensationContext) => {
        console.warn(`Reversing API call for step: ${ctx.stepId}`);
        await revertFn();
    },

    // Resource deallocation
    deallocateResource: (resourceId: string) => async (ctx: CompensationContext) => {
        console.warn(`Deallocating resource: ${resourceId} for step: ${ctx.stepId}`);
        // Implementation would free/release resources
    },

    // Message queue cleanup
    purgeMessages: (queueName: string) => async (ctx: CompensationContext) => {
        console.warn(`Purging messages from queue: ${queueName} for step: ${ctx.stepId}`);
        // Implementation would clean up message queues
    },
};
