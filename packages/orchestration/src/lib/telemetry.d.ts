import { type Span } from '@opentelemetry/api';
export interface EnhancedSpanContext {
	workflowId?: string;
	workflowName?: string;
	workflowVersion?: string;
	stepId?: string;
	stepKind?: string;
	agentId?: string;
	attempt?: number;
	resourceUsage?: {
		memoryBytes?: number;
		cpuUtilization?: number;
	};
	coordinationId?: string;
	phase?: string;
	retryPolicy?: {
		maxRetries: number;
		backoffMs: number;
	};
}
interface Histogram {
	record: (value: number, attributes: Record<string, string>) => void;
}
interface Counter {
	add: (value: number, attributes: Record<string, string>) => void;
}
export interface WorkflowMetrics {
	stepDuration: Histogram;
	coordinationDuration: Histogram;
	stepExecutions: Counter;
	coordinationFailures: Counter;
}
export declare function gatherSpanAttributes(context: EnhancedSpanContext): Record<string, unknown>;
export declare function recordSuccessMetrics(
	name: string,
	duration: number,
	context: EnhancedSpanContext,
	metrics: WorkflowMetrics,
	span: Span,
): void;
export declare function recordErrorMetrics(
	name: string,
	err: unknown,
	duration: number,
	context: EnhancedSpanContext,
	metrics: WorkflowMetrics,
	span: Span,
): void;
//# sourceMappingURL=telemetry.d.ts.map
