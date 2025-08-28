import { context, trace, SpanStatusCode, metrics } from '@opentelemetry/api';

export const tracer = trace.getTracer('@cortex-os/orchestration');
export const meter = metrics.getMeter('@cortex-os/orchestration');

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
    span.setStatus({ code: SpanStatusCode.ERROR, message: String(err?.message ?? err) });
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

  // Set comprehensive span attributes
  const attributes: Record<string, any> = {
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
    if (context.resourceUsage.memoryBytes) {
      attributes['resource.memory.bytes'] = context.resourceUsage.memoryBytes;
    }
    if (context.resourceUsage.cpuUtilization) {
      attributes['resource.cpu.utilization'] = context.resourceUsage.cpuUtilization;
    }
  }

  if (context.retryPolicy) {
    attributes['retry.max_attempts'] = context.retryPolicy.maxRetries;
    attributes['retry.backoff_ms'] = context.retryPolicy.backoffMs;
  }

  span.setAttributes(attributes);

  // Add custom events for important milestones
  span.addEvent(`${name}.started`, {
    timestamp: startTime,
    'thread.id': process.pid,
  });

  try {
    const result = await fn();
    const duration = Date.now() - startTime;

    // Record success metrics
    if (name.includes('step')) {
      workflowMetrics.stepDuration.record(duration, {
        step_kind: context.stepKind || 'unknown',
        success: 'true',
      });
      workflowMetrics.stepExecutions.add(1, {
        step_kind: context.stepKind || 'unknown',
        result: 'success',
      });
    }

    if (name.includes('coordination')) {
      workflowMetrics.coordinationDuration.record(duration, {
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
    return result;
  } catch (err: any) {
    const duration = Date.now() - startTime;
    const errorMessage = String(err?.message ?? err);

    // Record failure metrics
    if (name.includes('step')) {
      workflowMetrics.stepDuration.record(duration, {
        step_kind: context.stepKind || 'unknown',
        success: 'false',
      });
      workflowMetrics.stepExecutions.add(1, {
        step_kind: context.stepKind || 'unknown',
        result: 'failure',
      });
    }

    if (name.includes('coordination')) {
      workflowMetrics.coordinationDuration.record(duration, {
        phase: context.phase || 'unknown',
        success: 'false',
      });
      workflowMetrics.coordinationFailures.add(1, {
        phase: context.phase || 'unknown',
        error_type: err.code || 'unknown',
      });
    }

    span.addEvent(`${name}.failed`, {
      timestamp: Date.now(),
      duration_ms: duration,
      'error.type': err.constructor.name,
      'error.code': err.code,
      'error.message': errorMessage,
    });

    // Set error status with detailed information
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: errorMessage,
    });

    // Add error attributes
    span.setAttributes({
      'error.type': err.constructor.name,
      'error.code': err.code || 'unknown',
      'error.message': errorMessage,
      'error.stack': err.stack,
    });

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
export function recordWorkflowStart(workflowId: string, workflowName: string): void {
  workflowMetrics.activeWorkflows.add(1, {
    workflow_name: workflowName,
  });
}

export function recordWorkflowEnd(
  workflowId: string,
  workflowName: string,
  success: boolean,
): void {
  workflowMetrics.activeWorkflows.add(-1, {
    workflow_name: workflowName,
  });
}

/**
 * Track agent lifecycle
 */
export function recordAgentActivation(agentId: string, capabilities: string[]): void {
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
