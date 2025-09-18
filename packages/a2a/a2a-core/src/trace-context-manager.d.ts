import { type TraceContext } from '../../a2a-contracts/src/trace-context.js';
/**
 * Run a function within a trace context
 */
export declare function withTraceContext(
	context: TraceContext,
	fn: () => Promise<void>,
): Promise<void>;
/**
 * Get the current trace context
 */
export declare function getCurrentTraceContext(): TraceContext | undefined;
/**
 * Check if we're currently within a trace context
 */
export declare function hasTraceContext(): boolean;
/**
 * Execute a function with the current context, or create a new one if none exists
 */
export declare function ensureTraceContext(
	fn: () => Promise<void>,
	defaultContext?: TraceContext,
): Promise<void>;
//# sourceMappingURL=trace-context-manager.d.ts.map
