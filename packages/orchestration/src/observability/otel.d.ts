import type { EnhancedSpanContext, WorkflowMetrics } from '../lib/telemetry.js';
export type { EnhancedSpanContext } from '../lib/telemetry.js';
export declare const tracer: import('@opentelemetry/api').Tracer;
export declare const meter: import('@opentelemetry/api').Meter;
type CounterLike = {
	add: (value: number, attributes: Record<string, string>) => void;
};
type GaugeLike = {
	record: (value: number, attributes: Record<string, string>) => void;
};
interface ExtendedWorkflowMetrics extends WorkflowMetrics {
	retryAttempts: CounterLike;
	circuitBreakerTrips: CounterLike;
	activeWorkflows: CounterLike;
	activeAgents: CounterLike;
	resourceUtilization: GaugeLike;
}
export declare const workflowMetrics: ExtendedWorkflowMetrics;
export declare function withSpan<T>(
	name: string,
	fn: () => Promise<T>,
	attrs?: Record<string, unknown>,
): Promise<T>;
export declare function withEnhancedSpan<T>(
	name: string,
	fn: () => Promise<T>,
	spanCtx?: EnhancedSpanContext,
): Promise<T>;
/**
 * Record retry attempt metrics
 */
export declare function recordRetryAttempt(
	stepKind: string,
	attempt: number,
	errorType: string,
	delay: number,
): void;
/**
 * Record circuit breaker trip
 */
export declare function recordCircuitBreakerTrip(
	name: string,
	previousState: string,
	reason: string,
): void;
/**
 * Update resource utilization metrics
 */
export declare function updateResourceUtilization(
	resourceType: string,
	utilization: number,
	agentId?: string,
): void;
/**
 * Track workflow lifecycle
 */
export declare function recordWorkflowStart(_workflowId: string, workflowName: string): void;
export declare function recordWorkflowEnd(
	_workflowId: string,
	workflowName: string,
	_success: boolean,
): void;
/**
 * Track agent lifecycle
 */
export declare function recordAgentActivation(agentId: string, capabilities: string[]): void;
export declare function recordAgentDeactivation(agentId: string): void;
//# sourceMappingURL=otel.d.ts.map
