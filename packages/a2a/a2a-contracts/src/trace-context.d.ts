/**
 * W3C Trace Context utilities for distributed tracing in A2A messaging
 * Implements W3C Trace Context specification: https://www.w3.org/TR/trace-context/
 */
/**
 * Trace context information extracted from W3C headers
 */
export interface TraceContext {
	traceId: string;
	spanId: string;
	traceFlags: number;
	traceState?: string;
	baggage?: string;
}
/**
 * Generate a new trace ID (16 bytes as hex string)
 */
export declare function generateTraceId(): string;
/**
 * Generate a new span ID (8 bytes as hex string)
 */
export declare function generateSpanId(): string;
/**
 * Create a new trace context for starting a new trace
 */
export declare function createTraceContext(options?: {
	traceId?: string;
	spanId?: string;
	traceFlags?: number;
	traceState?: string;
	baggage?: string;
}): TraceContext;
/**
 * Create a child span context from a parent trace context
 */
export declare function createChildSpan(parentContext: TraceContext): TraceContext;
/**
 * Extract trace context from W3C traceparent header
 * Format: 00-traceId-spanId-traceFlags
 */
export declare function parseTraceParent(traceparent: string): {
	traceId: string;
	spanId: string;
	traceFlags: number;
} | null;
/**
 * Create W3C traceparent header from trace context
 */
export declare function createTraceParent(context: TraceContext): string;
/**
 * Extract trace context from envelope headers
 */
export declare function extractTraceContext(envelope: {
	traceparent?: string;
	tracestate?: string;
	baggage?: string;
}): TraceContext | null;
/**
 * Inject trace context into envelope headers
 */
export declare function injectTraceContext(
	envelope: Record<string, unknown>,
	context: TraceContext,
): void;
/**
 * Propagate trace context from incoming to outgoing envelope
 * Creates a child span for the outgoing message
 */
export declare function propagateTraceContext(
	incomingEnvelope: {
		traceparent?: string;
		tracestate?: string;
		baggage?: string;
	},
	outgoingEnvelope: Record<string, unknown>,
): void;
/**
 * Check if the current trace is sampled
 */
export declare function isSampled(context: TraceContext): boolean;
/**
 * Set sampling decision for trace context
 */
export declare function setSampling(context: TraceContext, sampled: boolean): TraceContext;
/**
 * Add vendor-specific data to trace state
 */
export declare function addTraceState(
	context: TraceContext,
	vendor: string,
	value: string,
): TraceContext;
/**
 * Get vendor-specific data from trace state
 */
export declare function getTraceState(context: TraceContext, vendor: string): string | null;
/**
 * Add baggage item to trace context
 */
export declare function addBaggage(context: TraceContext, key: string, value: string): TraceContext;
/**
 * Get baggage item from trace context
 */
export declare function getBaggage(context: TraceContext, key: string): string | null;
//# sourceMappingURL=trace-context.d.ts.map
