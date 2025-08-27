import { AsyncLocalStorage } from 'async_hooks';
import type { TraceContext } from '@cortex-os/a2a-contracts/trace-context';

/**
 * AsyncLocalStorage-based trace context manager for Node.js
 * Provides thread-safe trace context propagation across async boundaries
 */

class TraceContextManager {
  private static instance: TraceContextManager;
  private readonly storage: AsyncLocalStorage<TraceContext>;

  private constructor() {
    this.storage = new AsyncLocalStorage<TraceContext>();
  }

  static getInstance(): TraceContextManager {
    if (!TraceContextManager.instance) {
      TraceContextManager.instance = new TraceContextManager();
    }
    return TraceContextManager.instance;
  }

  /**
   * Run a function within a trace context
   */
  async runWithContext(context: TraceContext, fn: () => Promise<void>): Promise<void> {
    return new Promise((resolve, reject) => {
      this.storage.run(context, async () => {
        try {
          await fn();
          resolve();
        } catch (error) {
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      });
    });
  }

  /**
   * Get the current trace context
   */
  getCurrentContext(): TraceContext | undefined {
    return this.storage.getStore();
  }

  /**
   * Check if we're currently within a trace context
   */
  hasContext(): boolean {
    return this.storage.getStore() !== undefined;
  }

  /**
   * Execute a function with the current context, or create a new one if none exists
   */
  async withContext(fn: () => Promise<void>, defaultContext?: TraceContext): Promise<void> {
    const currentContext = this.getCurrentContext();
    if (currentContext) {
      return fn();
    }

    // No current context, use default or create new one
    const context = defaultContext || this.createDefaultContext();
    return this.runWithContext(context, fn);
  }

  /**
   * Create a default trace context
   */
  private createDefaultContext(): TraceContext {
    const { createTraceContext } = require('@cortex-os/a2a-contracts/trace-context');
    return createTraceContext();
  }
}

// Export singleton instance
export const traceContextManager = TraceContextManager.getInstance();

/**
 * Convenience functions for working with trace context
 */

/**
 * Get the current trace context
 */
export function getCurrentTraceContext(): TraceContext | undefined {
  return traceContextManager.getCurrentContext();
}

/**
 * Check if we're in a trace context
 */
export function hasTraceContext(): boolean {
  return traceContextManager.hasContext();
}

/**
 * Run function with trace context
 */
export function withTraceContext(context: TraceContext, fn: () => Promise<void>): Promise<void> {
  return traceContextManager.runWithContext(context, fn);
}

/**
 * Execute function ensuring trace context exists
 */
export function ensureTraceContext(
  fn: () => Promise<void>,
  defaultContext?: TraceContext,
): Promise<void> {
  return traceContextManager.withContext(fn, defaultContext);
}
