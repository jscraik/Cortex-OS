/**
 * @fileoverview OTEL tracing with ULID propagation
 */
import { SpanKind } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { type TraceContext, type ULID } from '../index.js';
/**
 * Initialize OTEL tracing and metrics
 */
export declare function initializeObservability(
	serviceName: string,
	version?: string,
): NodeSDK;
export declare const initializeTracing: typeof initializeObservability;
/**
 * Start console viewer for traces and metrics
 */
export declare function startConsoleViewer(
	serviceName: string,
	version?: string,
): NodeSDK;
/**
 * Create a new span with ULID context
 */
export declare function withSpan<T>(
	name: string,
	fn: (runId: ULID, traceContext: TraceContext) => Promise<T>,
	options?: {
		runId?: ULID;
		kind?: SpanKind;
		attributes?: Record<string, string | number | boolean>;
	},
): Promise<T>;
/**
 * Add ULID to active span
 */
export declare function addRunIdToSpan(runId: ULID): void;
/**
 * Get current trace context
 */
export declare function getCurrentTraceContext(): TraceContext | null;
//# sourceMappingURL=index.d.ts.map
