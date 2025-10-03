import { SpanStatusCode } from '@opentelemetry/api';
export function gatherSpanAttributes(context) {
	const attributes = {
		'orchestration.version': '1.0.0',
		'span.kind': 'internal',
	};
	if (context.workflowId) attributes['workflow.id'] = context.workflowId;
	if (context.workflowName) attributes['workflow.name'] = context.workflowName;
	if (context.workflowVersion) attributes['workflow.version'] = context.workflowVersion;
	if (context.stepId) attributes['workflow.step.id'] = context.stepId;
	if (context.stepKind) attributes['workflow.step.kind'] = context.stepKind;
	if (context.agentId) attributes['agent.id'] = context.agentId;
	if (context.attempt !== undefined) attributes['execution.attempt'] = context.attempt;
	if (context.coordinationId) attributes['coordination.id'] = context.coordinationId;
	if (context.phase) attributes['coordination.phase'] = context.phase;
	if (context.resourceUsage) {
		if (context.resourceUsage.memoryBytes !== undefined)
			attributes['resource.memory.bytes'] = context.resourceUsage.memoryBytes;
		if (context.resourceUsage.cpuUtilization !== undefined)
			attributes['resource.cpu.utilization'] = context.resourceUsage.cpuUtilization;
	}
	if (context.retryPolicy) {
		attributes['retry.max_attempts'] = context.retryPolicy.maxRetries;
		attributes['retry.backoff_ms'] = context.retryPolicy.backoffMs;
	}
	return attributes;
}
export function recordSuccessMetrics(name, duration, context, metrics, span) {
	if (name.includes('step')) {
		metrics.stepDuration.record(duration, {
			step_kind: context.stepKind || 'unknown',
			success: 'true',
		});
		metrics.stepExecutions.add(1, {
			step_kind: context.stepKind || 'unknown',
			result: 'success',
		});
	}
	if (name.includes('coordination')) {
		metrics.coordinationDuration.record(duration, {
			phase: context.phase || 'unknown',
			success: 'true',
		});
	}
	span.addEvent(`${name}.completed`, {
		timestamp: Date.now(),
		duration_ms: duration,
		success: true,
	});
	span.setStatus({ code: SpanStatusCode.OK });
}
export function recordErrorMetrics(name, err, duration, context, metrics, span) {
	const errorObj = err;
	const errorMessage = String(errorObj?.message ?? err);
	if (name.includes('step')) {
		metrics.stepDuration.record(duration, {
			step_kind: context.stepKind || 'unknown',
			success: 'false',
		});
		metrics.stepExecutions.add(1, {
			step_kind: context.stepKind || 'unknown',
			result: 'failure',
		});
	}
	if (name.includes('coordination')) {
		metrics.coordinationDuration.record(duration, {
			phase: context.phase || 'unknown',
			success: 'false',
		});
		metrics.coordinationFailures.add(1, {
			phase: context.phase || 'unknown',
			error_type: errorObj?.code || 'unknown',
		});
	}
	span.addEvent(`${name}.failed`, {
		timestamp: Date.now(),
		duration_ms: duration,
		'error.type': errorObj?.constructor?.name ?? 'Error',
		'error.code': errorObj?.code,
		'error.message': errorMessage,
	});
	span.setStatus({ code: SpanStatusCode.ERROR, message: errorMessage });
	span.setAttributes({
		'error.type': errorObj?.constructor?.name ?? 'Error',
		'error.code': errorObj?.code || 'unknown',
		'error.message': errorMessage,
		'error.stack': errorObj?.stack,
	});
}
//# sourceMappingURL=telemetry.js.map
