import { randomUUID } from 'crypto';

// Temporary stub implementations for telemetry until the telemetry package is fixed
const withSpan = async (name: string, fn: (span: any) => Promise<any>) => {
  return fn({ name });
};

const logWithSpan = (level: string, message: string, attributes?: any, span?: any) => {
  console.log(`[${level}] ${message}`, attributes);
};

/**
 * Saga Pattern Implementation for ASBR
 * Provides distributed transaction coordination with compensation support
 */

/**
 * Saga step definition with forward and compensation actions
 */
export interface SagaStep<TCtx = any> {
  id: string;
  name: string;
  execute: (context: TCtx) => Promise<TCtx>;
  compensate?: (context: TCtx, error?: Error) => Promise<TCtx>;
  retryPolicy?: {
    maxRetries: number;
    backoffMs: number;
  };
}

/**
 * Saga execution state
 */
export enum SagaState {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  COMPENSATING = 'COMPENSATING',
  COMPENSATED = 'COMPENSATED',
  FAILED = 'FAILED',
}

/**
 * Saga execution context
 */
export interface SagaContext {
  sagaId: string;
  correlationId: string;
  state: SagaState;
  currentStep: number;
  executedSteps: string[];
  startTime: Date;
  endTime?: Date;
  error?: {
    step: string;
    message: string;
    stack?: string;
  };
  metadata: Record<string, any>;
}

/**
 * Saga execution result
 */
export interface SagaResult<TCtx = any> {
  success: boolean;
  context: TCtx;
  sagaContext: SagaContext;
  error?: Error;
  compensationPerformed: boolean;
}

/**
 * Saga orchestrator for managing distributed transactions
 */
export class SagaOrchestrator<TCtx = any> {
  private readonly steps: SagaStep<TCtx>[] = [];
  private readonly contextStore?: {
    save: (context: SagaContext) => Promise<void>;
    load: (sagaId: string) => Promise<SagaContext | null>;
    update: (sagaId: string, context: Partial<SagaContext>) => Promise<void>;
  };

  constructor(options?: {
    contextStore?: {
      save: (context: SagaContext) => Promise<void>;
      load: (sagaId: string) => Promise<SagaContext | null>;
      update: (sagaId: string, context: Partial<SagaContext>) => Promise<void>;
    };
  }) {
    this.contextStore = options?.contextStore;
  }

  /**
   * Add a step to the saga
   */
  addStep(step: SagaStep<TCtx>): this {
    this.steps.push(step);
    return this;
  }

  /**
   * Execute the saga with compensation support
   */
  async execute(
    initialContext: TCtx,
    options?: {
      sagaId?: string;
      correlationId?: string;
      metadata?: Record<string, any>;
    },
  ): Promise<SagaResult<TCtx>> {
    const sagaId = options?.sagaId || randomUUID();
    const correlationId = options?.correlationId || randomUUID();

    const sagaContext: SagaContext = {
      sagaId,
      correlationId,
      state: SagaState.RUNNING,
      currentStep: 0,
      executedSteps: [],
      startTime: new Date(),
      metadata: options?.metadata || {},
    };

    let currentContext = initialContext;
    let compensationPerformed = false;

    try {
      // Save initial saga context if store is available
      if (this.contextStore) {
        await this.contextStore.save(sagaContext);
      }

      // Execute all steps
      for (let i = 0; i < this.steps.length; i++) {
        const step = this.steps[i];
        sagaContext.currentStep = i;

        await withSpan(`saga.step.${step.name}`, async (span) => {
          span.setAttributes({
            'saga.id': sagaId,
            'saga.step': step.name,
            'saga.stepIndex': i,
          });

          try {
            // Execute step with retry logic
            currentContext = await this.executeStepWithRetry(step, currentContext);

            // Mark step as executed
            sagaContext.executedSteps.push(step.id);

            // Update saga context
            if (this.contextStore) {
              await this.contextStore.update(sagaId, {
                currentStep: i + 1,
                executedSteps: sagaContext.executedSteps,
              });
            }

            logWithSpan(
              'info',
              `Saga step completed`,
              {
                sagaId,
                step: step.name,
                stepIndex: i,
              },
              span,
            );
          } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));

            logWithSpan(
              'error',
              `Saga step failed`,
              {
                sagaId,
                step: step.name,
                error: err.message,
              },
              span,
            );

            // Start compensation
            sagaContext.state = SagaState.COMPENSATING;
            sagaContext.error = {
              step: step.name,
              message: err.message,
              stack: err.stack,
            };

            if (this.contextStore) {
              await this.contextStore.update(sagaId, sagaContext);
            }

            // Perform compensation in reverse order
            currentContext = await this.compensate(sagaContext, currentContext, err);
            compensationPerformed = true;

            throw err;
          }
        });
      }

      // Mark saga as completed
      sagaContext.state = SagaState.COMPLETED;
      sagaContext.endTime = new Date();

      if (this.contextStore) {
        await this.contextStore.update(sagaId, sagaContext);
      }

      return {
        success: true,
        context: currentContext,
        sagaContext,
        compensationPerformed: false,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      sagaContext.state = SagaState.FAILED;
      sagaContext.endTime = new Date();

      if (this.contextStore) {
        await this.contextStore.update(sagaId, sagaContext);
      }

      return {
        success: false,
        context: currentContext,
        sagaContext,
        error: err,
        compensationPerformed,
      };
    }
  }

  /**
   * Execute a single step with retry logic
   */
  private async executeStepWithRetry(step: SagaStep<TCtx>, context: TCtx): Promise<TCtx> {
    const retryPolicy = step.retryPolicy || { maxRetries: 0, backoffMs: 1000 };
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retryPolicy.maxRetries; attempt++) {
      try {
        return await step.execute(context);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < retryPolicy.maxRetries) {
          const delay = retryPolicy.backoffMs * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  /**
   * Perform compensation for failed steps
   */
  private async compensate(
    sagaContext: SagaContext,
    context: TCtx,
    originalError: Error,
  ): Promise<TCtx> {
    let currentContext = context;

    // Compensate in reverse order
    const executedStepIds = new Set(sagaContext.executedSteps);
    const compensatableSteps = this.steps
      .filter((step) => executedStepIds.has(step.id) && step.compensate)
      .reverse();

    for (const step of compensatableSteps) {
      try {
        await withSpan(`saga.compensate.${step.name}`, async (span) => {
          span.setAttributes({
            'saga.id': sagaContext.sagaId,
            'saga.step': step.name,
          });

          currentContext = await step.compensate(currentContext, originalError);

          logWithSpan(
            'info',
            `Saga compensation completed`,
            {
              sagaId: sagaContext.sagaId,
              step: step.name,
            },
            span,
          );
        });
      } catch (compensationError) {
        const err =
          compensationError instanceof Error
            ? compensationError
            : new Error(String(compensationError));

        logWithSpan('error', `Saga compensation failed`, {
          sagaId: sagaContext.sagaId,
          step: step.name,
          error: err.message,
        });

        // Continue with other compensations even if one fails
      }
    }

    sagaContext.state = SagaState.COMPENSATED;
    return currentContext;
  }

  /**
   * Resume a saga from a persisted state
   */
  async resume(sagaId: string): Promise<SagaResult<TCtx> | null> {
    if (!this.contextStore) {
      throw new Error('Context store required for saga resumption');
    }

    const sagaContext = await this.contextStore.load(sagaId);
    if (!sagaContext) {
      return null;
    }

    // Resume based on current state
    switch (sagaContext.state) {
      case SagaState.COMPENSATING:
        // Resume compensation
        return this.resumeCompensation(sagaContext);

      case SagaState.RUNNING:
        // Resume execution from current step
        return this.resumeExecution(sagaContext);

      default:
        return null;
    }
  }

  private async resumeCompensation(sagaContext: SagaContext): Promise<SagaResult<TCtx>> {
    if (!this.contextStore) {
      throw new Error('Context store required for saga resumption');
    }

    let currentContext: TCtx;
    try {
      // Load the context from the last known state
      // Note: This assumes the context is stored separately or can be reconstructed
      currentContext = {} as TCtx; // This should be loaded from persistent storage

      // Find the last compensated step and continue from there
      const lastCompensatedIndex = sagaContext.executedSteps.length - 1;

      for (let i = lastCompensatedIndex; i >= 0; i--) {
        const stepId = sagaContext.executedSteps[i];
        const step = this.steps.find((s) => s.id === stepId);

        if (!step?.compensate) continue;

        try {
          await withSpan(`saga.compensate.${step.name}`, async (span) => {
            span.setAttributes({
              'saga.id': sagaContext.sagaId,
              'saga.step': step.name,
              'saga.resume': true,
            });

            const originalError = sagaContext.error
              ? new Error(sagaContext.error.message)
              : new Error('Unknown error during saga execution');

            currentContext = await step.compensate(currentContext, originalError);

            logWithSpan(
              'info',
              `Saga compensation resumed and completed`,
              {
                sagaId: sagaContext.sagaId,
                step: step.name,
              },
              span,
            );
          });
        } catch (compensationError) {
          const err =
            compensationError instanceof Error
              ? compensationError
              : new Error(String(compensationError));

          logWithSpan('error', `Saga compensation resume failed`, {
            sagaId: sagaContext.sagaId,
            step: step.name,
            error: err.message,
          });

          sagaContext.state = SagaState.FAILED;
          await this.contextStore.update(sagaContext.sagaId, sagaContext);

          return {
            success: false,
            context: currentContext,
            sagaContext,
            error: err,
            compensationPerformed: true,
          };
        }
      }

      sagaContext.state = SagaState.COMPENSATED;
      sagaContext.endTime = new Date();
      await this.contextStore.update(sagaContext.sagaId, sagaContext);

      return {
        success: false, // Compensation completed but original saga failed
        context: currentContext,
        sagaContext,
        compensationPerformed: true,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      sagaContext.state = SagaState.FAILED;
      sagaContext.endTime = new Date();
      await this.contextStore.update(sagaContext.sagaId, sagaContext);

      return {
        success: false,
        context: {} as TCtx,
        sagaContext,
        error: err,
        compensationPerformed: true,
      };
    }
  }

  private async resumeExecution(sagaContext: SagaContext): Promise<SagaResult<TCtx>> {
    if (!this.contextStore) {
      throw new Error('Context store required for saga resumption');
    }

    let currentContext: TCtx;
    try {
      // Load the context from the last known state
      // Note: This assumes the context is stored separately or can be reconstructed
      currentContext = {} as TCtx; // This should be loaded from persistent storage

      const startStepIndex = sagaContext.currentStep;

      // Continue execution from the next step
      for (let i = startStepIndex; i < this.steps.length; i++) {
        const step = this.steps[i];
        sagaContext.currentStep = i;

        await withSpan(`saga.step.${step.name}`, async (span) => {
          span.setAttributes({
            'saga.id': sagaContext.sagaId,
            'saga.step': step.name,
            'saga.stepIndex': i,
            'saga.resume': true,
          });

          try {
            // Execute step with retry logic
            currentContext = await this.executeStepWithRetry(step, currentContext);

            // Mark step as executed
            sagaContext.executedSteps.push(step.id);

            // Update saga context
            await this.contextStore.update(sagaContext.sagaId, {
              currentStep: i + 1,
              executedSteps: sagaContext.executedSteps,
            });

            logWithSpan(
              'info',
              `Saga step resumed and completed`,
              {
                sagaId: sagaContext.sagaId,
                step: step.name,
                stepIndex: i,
              },
              span,
            );
          } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));

            logWithSpan(
              'error',
              `Saga step resume failed`,
              {
                sagaId: sagaContext.sagaId,
                step: step.name,
                error: err.message,
              },
              span,
            );

            // Start compensation
            sagaContext.state = SagaState.COMPENSATING;
            sagaContext.error = {
              step: step.name,
              message: err.message,
              stack: err.stack,
            };

            await this.contextStore.update(sagaContext.sagaId, sagaContext);

            // Perform compensation in reverse order
            currentContext = await this.compensate(sagaContext, currentContext, err);

            throw err;
          }
        });
      }

      // Mark saga as completed
      sagaContext.state = SagaState.COMPLETED;
      sagaContext.endTime = new Date();
      await this.contextStore.update(sagaContext.sagaId, sagaContext);

      return {
        success: true,
        context: currentContext,
        sagaContext,
        compensationPerformed: false,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      sagaContext.state = SagaState.FAILED;
      sagaContext.endTime = new Date();
      await this.contextStore.update(sagaContext.sagaId, sagaContext);

      return {
        success: false,
        context: currentContext || ({} as TCtx),
        sagaContext,
        error: err,
        compensationPerformed: true,
      };
    }
  }
}

/**
 * Saga builder for fluent API
 */
export class SagaBuilder<TCtx = any> {
  private readonly orchestrator: SagaOrchestrator<TCtx>;

  constructor(options?: {
    contextStore?: {
      save: (context: SagaContext) => Promise<void>;
      load: (sagaId: string) => Promise<SagaContext | null>;
      update: (sagaId: string, context: Partial<SagaContext>) => Promise<void>;
    };
  }) {
    this.orchestrator = new SagaOrchestrator(options);
  }

  /**
   * Add a step with both execute and compensate actions
   */
  step(
    name: string,
    execute: (ctx: TCtx) => Promise<TCtx>,
    compensate?: (ctx: TCtx, error?: Error) => Promise<TCtx>,
  ): this {
    this.orchestrator.addStep({
      id: randomUUID(),
      name,
      execute,
      compensate,
    });
    return this;
  }

  /**
   * Build the saga orchestrator
   */
  build(): SagaOrchestrator<TCtx> {
    return this.orchestrator;
  }
}

/**
 * Create a saga builder
 */
export function createSaga<TCtx = any>(options?: {
  contextStore?: {
    save: (context: SagaContext) => Promise<void>;
    load: (sagaId: string) => Promise<SagaContext | null>;
    update: (sagaId: string, context: Partial<SagaContext>) => Promise<void>;
  };
}): SagaBuilder<TCtx> {
  return new SagaBuilder(options);
}

/**
 * Legacy simple saga function for backward compatibility
 */
export type Step<TCtx> = (ctx: TCtx) => Promise<TCtx>;
export function saga<TCtx>(...steps: Step<TCtx>[]) {
  return async (ctx: TCtx) => {
    let cur = ctx;
    for (const s of steps) cur = await s(cur);
    return cur;
  };
}
