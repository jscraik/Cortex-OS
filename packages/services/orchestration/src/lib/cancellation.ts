/**
 * Advanced cancellation support for orchestration workflows
 * Provides timeout handling, graceful shutdown, and cleanup coordination
 */

export interface CancellationOptions {
  /** Timeout in milliseconds before automatic cancellation */
  timeoutMs?: number;
  /** Whether to perform partial rollback on cancellation */
  enablePartialRollback?: boolean;
  /** Custom reason for cancellation */
  reason?: string;
}

export interface CancellationResult {
  /** Whether cancellation was completed successfully */
  cancelled: boolean;
  /** Steps that were rolled back during cancellation */
  rolledBackSteps: string[];
  /** Errors that occurred during cancellation cleanup */
  cleanupErrors: Error[];
  /** Reason for cancellation */
  reason: string;
  /** Time when cancellation was initiated */
  cancelledAt: Date;
}

export class CancellationController {
  private readonly abortController: AbortController;
  private readonly options: CancellationOptions;
  private cancelled = false;
  private _cancelledAt?: Date;
  private cleanupErrors: Error[] = [];
  private rolledBackSteps: string[] = [];

  constructor(options: CancellationOptions = {}) {
    this.abortController = new AbortController();
    this.options = {
      enablePartialRollback: true,
      reason: 'Manual cancellation',
      ...options,
    };

    // Set up timeout if specified
    if (this.options.timeoutMs) {
      setTimeout(() => {
        if (!this.cancelled) {
          this.cancel(); // Use the reason already set in options
        }
      }, this.options.timeoutMs);
    }
  }

  get signal(): AbortSignal {
    return this.abortController.signal;
  }

  get isCancelled(): boolean {
    return this.cancelled;
  }

  get reason(): string {
    return this.options.reason || 'Unknown';
  }

  get cancelledAt(): Date | undefined {
    return this._cancelledAt;
  }

  cancel(reason?: string): void {
    if (this.cancelled) return;

    this.cancelled = true;
    this._cancelledAt = new Date();
    if (reason) {
      this.options.reason = reason;
    }

    this.abortController.abort();
  }

  addCleanupError(error: Error): void {
    this.cleanupErrors.push(error);
  }

  addRolledBackStep(stepId: string): void {
    this.rolledBackSteps.push(stepId);
  }

  getResult(): CancellationResult {
    return {
      cancelled: this.cancelled,
      rolledBackSteps: [...this.rolledBackSteps],
      cleanupErrors: [...this.cleanupErrors],
      reason: this.options.reason || 'Unknown',
      cancelledAt: this._cancelledAt || new Date(),
    };
  }

  /** Create a cancellation controller with timeout */
  static withTimeout(timeoutMs: number, reason?: string): CancellationController {
    return new CancellationController({
      timeoutMs,
      reason: reason || `Timeout after ${timeoutMs}ms`,
      enablePartialRollback: true,
    });
  }

  /** Create a cancellation controller linked to an existing AbortSignal */
  static fromSignal(signal: AbortSignal, options: CancellationOptions = {}): CancellationController {
    const controller = new CancellationController(options);
    
    if (signal.aborted) {
      controller.cancel('Parent signal aborted');
    } else {
      signal.addEventListener('abort', () => {
        controller.cancel('Parent signal aborted');
      });
    }
    
    return controller;
  }
}

export class CancellationError extends Error {
  readonly cancelled = true;
  readonly cancelledAt: Date;
  readonly reason: string;

  constructor(reason: string, cancelledAt: Date = new Date()) {
    super(`Workflow cancelled: ${reason}`);
    this.name = 'CancellationError';
    this.reason = reason;
    this.cancelledAt = cancelledAt;
  }
}

/** Utility to check if an error is a cancellation */
export function isCancellationError(error: unknown): error is CancellationError {
  return error instanceof CancellationError || 
         (error instanceof Error && error.message.includes('Aborted'));
}

/** Utility to wrap operations with timeout and cancellation */
export async function withCancellation<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  options: CancellationOptions = {}
): Promise<T> {
  const controller = new CancellationController(options);
  
  try {
    return await operation(controller.signal);
  } catch (error) {
    if (controller.isCancelled) {
      throw new CancellationError(controller.reason, controller.cancelledAt);
    }
    throw error;
  }
}