import { AsyncLocalStorage } from 'node:async_hooks';
import { createTraceContext, } from '../../a2a-contracts/src/trace-context.js';
/**
 * AsyncLocalStorage-based trace context manager for Node.js
 * Provides thread-safe trace context propagation across async boundaries
 */
const storage = new AsyncLocalStorage();
/**
 * Run a function within a trace context
 */
export async function withTraceContext(context, fn) {
    return new Promise((resolve, reject) => {
        storage.run(context, async () => {
            try {
                await fn();
                resolve();
            }
            catch (error) {
                reject(error instanceof Error ? error : new Error(String(error)));
            }
        });
    });
}
/**
 * Get the current trace context
 */
export function getCurrentTraceContext() {
    return storage.getStore();
}
/**
 * Check if we're currently within a trace context
 */
export function hasTraceContext() {
    return storage.getStore() !== undefined;
}
/**
 * Execute a function with the current context, or create a new one if none exists
 */
export async function ensureTraceContext(fn, defaultContext) {
    const currentContext = getCurrentTraceContext();
    if (currentContext) {
        return fn();
    }
    // No current context, use default or create new one
    const context = defaultContext || createTraceContext();
    return withTraceContext(context, fn);
}
//# sourceMappingURL=trace-context-manager.js.map