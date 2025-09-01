import { createTraceContext, type TraceContext } from '@cortex-os/a2a-contracts/trace-context';
import { AsyncLocalStorage } from 'async_hooks';

/**
 * AsyncLocalStorage-based trace context manager for Node.js
 * Provides thread-safe trace context propagation across async boundaries
 */

const storage = new AsyncLocalStorage<TraceContext>();

/**
 * Run a function within a trace context
 */
export async function withTraceContext(
  context: TraceContext,
  fn: () => Promise<void>,
): Promise<void> {
  return new Promise((resolve, reject) => {
    storage.run(context, async () => {
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
export function getCurrentTraceContext(): TraceContext | undefined {
  return storage.getStore();
}

/**
 * Check if we're currently within a trace context
 */
export function hasTraceContext(): boolean {
  return storage.getStore() !== undefined;
}

/**
 * Execute a function with the current context, or create a new one if none exists
 */
export async function ensureTraceContext(
  fn: () => Promise<void>,
  defaultContext?: TraceContext,
): Promise<void> {
  const currentContext = getCurrentTraceContext();
  if (currentContext) {
    return fn();
  }

  // No current context, use default or create new one
  const context = defaultContext || createTraceContext();
  return withTraceContext(context, fn);
}
