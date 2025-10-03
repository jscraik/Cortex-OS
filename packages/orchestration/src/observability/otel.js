import { context, metrics, SpanStatusCode, trace } from '@opentelemetry/api';
import {
	gatherSpanAttributes,
	recordErrorMetrics,
	recordSuccessMetrics,
} from '../lib/telemetry.js';
export const tracer = trace.getTracer('@cortex-os/orchestration');
export const meter = metrics.getMeter('@cortex-os/orchestration');
function toAttributes(input) {
	const out = {};
	for (const [k, v] of Object.entries(input)) {
		if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
			out[k] = v;
		}
	}
	return out;
}
// Create comprehensive metrics
export const workflowMetrics = {
	// Duration histograms
	stepDuration: meter.createHistogram('workflow_step_duration_ms', {
		description: 'Duration of workflow step execution in milliseconds',
	}),
	coordinationDuration: meter.createHistogram('agent_coordination_duration_ms', {
		description: 'Duration of multi-agent coordination in milliseconds',
	}),
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
export async function withSpan(name, fn, attrs) {
	const span = tracer.startSpan(name, undefined, context.active());
	if (attrs) span.setAttributes(toAttributes(attrs));
	try {
		const res = await fn();
		span.setStatus({ code: SpanStatusCode.OK });
		return res;
	} catch (err) {
		span.setStatus({
			code: SpanStatusCode.ERROR,
			message: String(err?.message ?? err),
		});
		throw err;
	} finally {
		span.end();
	}
}
export async function withEnhancedSpan(name, fn, spanCtx = {}) {
	const span = tracer.startSpan(name);
	const startTime = Date.now();
	span.setAttributes(toAttributes(gatherSpanAttributes(spanCtx)));
	// Add custom events for important milestones
	span.addEvent(`${name}.started`, {
		timestamp: startTime,
		'thread.id': process.pid,
	});
	try {
		const result = await fn();
		const duration = Date.now() - startTime;
		recordSuccessMetrics(name, duration, spanCtx, workflowMetrics, span);
		return result;
	} catch (err) {
		const duration = Date.now() - startTime;
		recordErrorMetrics(name, err, duration, spanCtx, workflowMetrics, span);
		throw err;
	} finally {
		span.end();
	}
}
/**
 * Record retry attempt metrics
 */
export function recordRetryAttempt(stepKind, attempt, errorType, delay) {
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
export function recordCircuitBreakerTrip(name, previousState, reason) {
	workflowMetrics.circuitBreakerTrips.add(1, {
		circuit_breaker: name,
		previous_state: previousState,
		reason,
	});
}
/**
 * Update resource utilization metrics
 */
export function updateResourceUtilization(resourceType, utilization, agentId) {
	workflowMetrics.resourceUtilization.record(utilization, {
		resource_type: resourceType,
		agent_id: agentId || 'unknown',
	});
}
/**
 * Track workflow lifecycle
 */
export function recordWorkflowStart(_workflowId, workflowName) {
	workflowMetrics.activeWorkflows.add(1, {
		workflow_name: workflowName,
	});
}
export function recordWorkflowEnd(_workflowId, workflowName, _success) {
	workflowMetrics.activeWorkflows.add(-1, {
		workflow_name: workflowName,
	});
}
/**
 * Track agent lifecycle
 */
export function recordAgentActivation(agentId, capabilities) {
	workflowMetrics.activeAgents.add(1, {
		agent_id: agentId,
		capabilities: capabilities.join(','),
	});
}
export function recordAgentDeactivation(agentId) {
	workflowMetrics.activeAgents.add(-1, {
		agent_id: agentId,
	});
}
//# sourceMappingURL=otel.js.map
