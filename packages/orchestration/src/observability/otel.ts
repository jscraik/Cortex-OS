import { context, metrics, SpanStatusCode, trace } from '@opentelemetry/api';
import type { EnhancedSpanContext, WorkflowMetrics } from '../lib/telemetry.js';
import {
	gatherSpanAttributes,
	recordErrorMetrics,
	recordSuccessMetrics,
} from '../lib/telemetry.js';

export type { EnhancedSpanContext } from '../lib/telemetry.js';

export const tracer = trace.getTracer('@cortex-os/orchestration');
export const meter = metrics.getMeter('@cortex-os/orchestration');

// Create comprehensive metrics
export const workflowMetrics: WorkflowMetrics & Record<string, any> = {
	// Duration histograms
	stepDuration: meter.createHistogram('workflow_step_duration_ms', {
		description: 'Duration of workflow step execution in milliseconds',
	}),

	coordinationDuration: meter.createHistogram(
		'agent_coordination_duration_ms',
		{
			description: 'Duration of multi-agent coordination in milliseconds',
		},
	),

	// Counters
	retryAttempts: meter.createCounter('workflow_retry_attempts_total', {
		description: 'Total number of retry attempts',
	}),

	stepExecutions: meter.createCounter('workflow_step_executions_total', {
		description: 'Total number of workflow step executions',
	}),

	coordinationFailures: meter.createCounter('coordination_failures_total', {
		description: 'Total number of coordination failures',
	}),

	circuitBreakerTrips: meter.createCounter('circuit_breaker_trips_total', {
		description: 'Total number of circuit breaker trips',
	}),

	// Gauges (UpDown counters)
	activeWorkflows: meter.createUpDownCounter('active_workflows', {
		description: 'Number of currently active workflows',
	}),

	activeAgents: meter.createUpDownCounter('active_agents', {
		description: 'Number of currently active agents',
	}),

	resourceUtilization: meter.createGauge('resource_utilization_ratio', {
		description: 'Resource utilization ratio (0-1)',
	}),
};

export async function withSpan<T>(
	name: string,
	fn: () => Promise<T>,
	attrs?: Record<string, unknown>,
): Promise<T> {
	const span = tracer.startSpan(name, undefined, context.active());
	if (attrs) span.setAttributes(attrs as any);
	try {
		const res = await fn();
		span.setStatus({ code: SpanStatusCode.OK });
		return res;
	} catch (err: any) {
		span.setStatus({
			code: SpanStatusCode.ERROR,
			message: String(err?.message ?? err),
		});
		throw err;
	} finally {
		span.end();
	}
}

export async function withEnhancedSpan<T>(
	name: string,
	fn: () => Promise<T>,
	context: EnhancedSpanContext = {},
): Promise<T> {
	const span = tracer.startSpan(name);
	const startTime = Date.now();
	span.setAttributes(gatherSpanAttributes(context));

	// Add custom events for important milestones
	span.addEvent(`${name}.started`, {
		timestamp: startTime,
		'thread.id': process.pid,
	});

	try {
		const result = await fn();
		const duration = Date.now() - startTime;
		recordSuccessMetrics(name, duration, context, workflowMetrics, span);
		return result;
	} catch (err: any) {
		const duration = Date.now() - startTime;
		recordErrorMetrics(name, err, duration, context, workflowMetrics, span);
		throw err;
	} finally {
		span.end();
	}
}

/**
 * Record retry attempt metrics
 */
export function recordRetryAttempt(
	stepKind: string,
	attempt: number,
	errorType: string,
	delay: number,
): void {
	workflowMetrics.retryAttempts.add(1, {
		step_kind: stepKind,
		attempt_number: attempt.toString(),
		error_type: errorType,
		delay_ms: delay.toString(),
	});
}

/**
 * Record circuit breaker trip
 */
export function recordCircuitBreakerTrip(
	name: string,
	previousState: string,
	reason: string,
): void {
	workflowMetrics.circuitBreakerTrips.add(1, {
		circuit_breaker: name,
		previous_state: previousState,
		reason,
	});
}

/**
 * Update resource utilization metrics
 */
export function updateResourceUtilization(
	resourceType: string,
	utilization: number,
	agentId?: string,
): void {
	workflowMetrics.resourceUtilization.record(utilization, {
		resource_type: resourceType,
		agent_id: agentId || 'unknown',
	});
}

/**
 * Track workflow lifecycle
 */
export function recordWorkflowStart(
	_workflowId: string,
	workflowName: string,
): void {
	workflowMetrics.activeWorkflows.add(1, {
		workflow_name: workflowName,
	});
}

export function recordWorkflowEnd(
	_workflowId: string,
	workflowName: string,
	_success: boolean,
): void {
	workflowMetrics.activeWorkflows.add(-1, {
		workflow_name: workflowName,
	});
}

/**
 * Track agent lifecycle
 */
export function recordAgentActivation(
	agentId: string,
	capabilities: string[],
): void {
	workflowMetrics.activeAgents.add(1, {
		agent_id: agentId,
		capabilities: capabilities.join(','),
	});
}

export function recordAgentDeactivation(agentId: string): void {
	workflowMetrics.activeAgents.add(-1, {
		agent_id: agentId,
	});
}
