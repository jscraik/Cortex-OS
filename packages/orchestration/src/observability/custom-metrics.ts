/**
 * Custom Metrics Implementation for Orchestration
 * Provides comprehensive metrics collection and reporting
 */

import { Counter, Histogram, Gauge, Registry } from 'prom-client';

export class OrchestrationMetrics {
	private readonly registry: Registry;

	// Workflow metrics
	readonly workflowsCreated = new Counter({
		name: 'orchestration_workflows_created_total',
		help: 'Total number of workflows created',
		labelNames: ['strategy', 'priority', 'status'],
		registers: [this.registry],
	});

	readonly workflowsCompleted = new Counter({
		name: 'orchestration_workflows_completed_total',
		help: 'Total number of workflows completed',
		labelNames: ['strategy', 'status', 'result'],
		registers: [this.registry],
	});

	readonly workflowDuration = new Histogram({
		name: 'orchestration_workflow_duration_seconds',
		help: 'Workflow execution duration in seconds',
		labelNames: ['strategy', 'status', 'result'],
		buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120, 300, 600, 1800],
		registers: [this.registry],
	});

	readonly activeWorkflows = new Gauge({
		name: 'orchestration_active_workflows',
		help: 'Number of currently active workflows',
		labelNames: ['strategy', 'status'],
		registers: [this.registry],
	});

	// Task metrics
	readonly tasksCreated = new Counter({
		name: 'orchestration_tasks_created_total',
		help: 'Total number of tasks created',
		labelNames: ['workflow_id', 'status', 'priority'],
		registers: [this.registry],
	});

	readonly tasksCompleted = new Counter({
		name: 'orchestration_tasks_completed_total',
		help: 'Total number of tasks completed',
		labelNames: ['workflow_id', 'status', 'result'],
		registers: [this.registry],
	});

	readonly taskDuration = new Histogram({
		name: 'orchestration_task_duration_seconds',
		help: 'Task execution duration in seconds',
		labelNames: ['workflow_id', 'agent_role', 'status'],
		buckets: [0.01, 0.05, 0.1, 0.5, 1, 5, 10, 30, 60],
		registers: [this.registry],
	});

	readonly activeTasks = new Gauge({
		name: 'orchestration_active_tasks',
		help: 'Number of currently active tasks',
		labelNames: ['workflow_id', 'agent_role', 'status'],
		registers: [this.registry],
	});

	// Agent metrics
	readonly agentRegistrations = new Counter({
		name: 'orchestration_agent_registrations_total',
		help: 'Total number of agent registrations',
		labelNames: ['agent_role', 'agent_type'],
		registers: [this.registry],
	});

	readonly agentExecutions = new Counter({
		name: 'orchestration_agent_executions_total',
		help: 'Total number of agent executions',
		labelNames: ['agent_id', 'agent_role', 'status'],
		registers: [this.registry],
	});

	readonly agentExecutionDuration = new Histogram({
		name: 'orchestration_agent_execution_duration_seconds',
		help: 'Agent execution duration in seconds',
		labelNames: ['agent_id', 'agent_role', 'task_type'],
		buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
		registers: [this.registry],
	});

	readonly agentPoolSize = new Gauge({
		name: 'orchestration_agent_pool_size',
		help: 'Current agent pool size',
		labelNames: ['agent_role', 'status'],
		registers: [this.registry],
	});

	readonly agentUtilization = new Gauge({
		name: 'orchestration_agent_utilization_percent',
		help: 'Agent utilization percentage',
		labelNames: ['agent_id', 'agent_role'],
		registers: [this.registry],
	});

	// Model provider metrics
	readonly modelRequests = new Counter({
		name: 'orchestration_model_requests_total',
		help: 'Total model API requests',
		labelNames: ['provider', 'model', 'operation', 'status'],
		registers: [this.registry],
	});

	readonly modelLatency = new Histogram({
		name: 'orchestration_model_latency_seconds',
		help: 'Model API latency in seconds',
		labelNames: ['provider', 'model', 'operation'],
		buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
		registers: [this.registry],
	});

	readonly modelTokens = new Counter({
		name: 'orchestration_model_tokens_total',
		help: 'Total tokens processed by model',
		labelNames: ['provider', 'model', 'token_type'],
		registers: [this.registry],
	});

	readonly modelErrors = new Counter({
		name: 'orchestration_model_errors_total',
		help: 'Total model API errors',
		labelNames: ['provider', 'model', 'error_type'],
		registers: [this.registry],
	});

	// Connection pool metrics
	readonly connectionPoolSize = new Gauge({
		name: 'orchestration_connection_pool_size',
		help: 'Current connection pool size',
		labelNames: ['provider', 'state'],
		registers: [this.registry],
	});

	readonly connectionAcquires = new Counter({
		name: 'orchestration_connection_acquires_total',
		help: 'Total connection acquires',
		labelNames: ['provider', 'result'],
		registers: [this.registry],
	});

	readonly connectionWaitTime = new Histogram({
		name: 'orchestration_connection_wait_seconds',
		help: 'Connection wait time in seconds',
		labelNames: ['provider'],
		buckets: [0.001, 0.01, 0.1, 0.5, 1, 5],
		registers: [this.registry],
	});

	// MCP tool metrics
	readonly mcpToolInvocations = new Counter({
		name: 'orchestration_mcp_tool_invocations_total',
		help: 'Total MCP tool invocations',
		labelNames: ['tool_name', 'status', 'error_type'],
		registers: [this.registry],
	});

	readonly mcpToolDuration = new Histogram({
		name: 'orchestration_mcp_tool_duration_seconds',
		help: 'MCP tool execution duration in seconds',
		labelNames: ['tool_name'],
		buckets: [0.01, 0.1, 0.5, 1, 5, 10],
		registers: [this.registry],
	});

	// Circuit breaker metrics
	readonly circuitBreakerState = new Gauge({
		name: 'orchestration_circuit_breaker_state',
		help: 'Circuit breaker state (0=closed, 1=open, 2=half-open)',
		labelNames: ['circuit_breaker_name'],
		registers: [this.registry],
	});

	readonly circuitBreakerRequests = new Counter({
		name: 'orchestration_circuit_breaker_requests_total',
		help: 'Total requests through circuit breaker',
		labelNames: ['circuit_breaker_name', 'result'],
		registers: [this.registry],
	});

	// Queue metrics
	readonly queueSize = new Gauge({
		name: 'orchestration_queue_size',
		help: 'Current queue size',
		labelNames: ['queue_name', 'priority'],
		registers: [this.registry],
	});

	readonly queueWaitTime = new Histogram({
		name: 'orchestration_queue_wait_seconds',
		help: 'Time spent in queue',
		labelNames: ['queue_name', 'priority'],
		buckets: [0.001, 0.01, 0.1, 0.5, 1, 5],
		registers: [this.registry],
	});

	constructor(registry?: Registry) {
		this.registry = registry || new Registry();
	}

	// Workflow metrics methods
	recordWorkflowCreated(strategy: string, priority: string): void {
		this.workflowsCreated.inc({ strategy, priority, status: 'created' });
		this.activeWorkflows.inc({ strategy, status: 'created' });
	}

	recordWorkflowCompleted(
		strategy: string,
		status: string,
		result: 'success' | 'failure' | 'cancelled',
		duration: number,
	): void {
		this.workflowsCompleted.inc({ strategy, status, result });
		this.workflowDuration.observe({ strategy, status, result }, duration);
		this.activeWorkflows.dec({ strategy, status });
	}

	// Task metrics methods
	recordTaskCreated(workflowId: string, status: string, priority: string): void {
		this.tasksCreated.inc({ workflow_id: workflowId, status, priority });
		this.activeTasks.inc({ workflow_id: workflowId, agent_role: 'unassigned', status });
	}

	recordTaskCompleted(
		workflowId: string,
		agentRole: string,
		status: string,
		result: 'success' | 'failure',
		duration: number,
	): void {
		this.tasksCompleted.inc({ workflow_id: workflowId, status, result });
		this.taskDuration.observe({ workflow_id: workflowId, agent_role, status }, duration);
		this.activeTasks.dec({ workflow_id: workflowId, agent_role, status });
	}

	// Agent metrics methods
	recordAgentRegistered(agentRole: string, agentType: string): void {
		this.agentRegistrations.inc({ agent_role: agentRole, agent_type: agentType });
		this.agentPoolSize.inc({ agent_role: agentRole, status: 'available' });
	}

	recordAgentExecution(
		agentId: string,
		agentRole: string,
		status: string,
		taskType: string,
		duration: number,
	): void {
		this.agentExecutions.inc({ agent_id: agentId, agent_role, status });
		this.agentExecutionDuration.observe({ agent_id: agentId, agent_role, task_type }, duration);
	}

	updateAgentUtilization(agentId: string, agentRole: string, utilization: number): void {
		this.agentUtilization.set({ agent_id: agentId, agent_role }, utilization);
	}

	// Model provider metrics methods
	recordModelRequest(
		provider: string,
		model: string,
		operation: string,
		status: 'success' | 'error',
		latency: number,
	): void {
		this.modelRequests.inc({ provider, model, operation, status });
		this.modelLatency.observe({ provider, model, operation }, latency);
	}

	recordModelTokens(provider: string, model: string, tokenType: 'input' | 'output', count: number): void {
		this.modelTokens.inc({ provider, model, token_type: tokenType }, count);
	}

	recordModelError(provider: string, model: string, errorType: string): void {
		this.modelErrors.inc({ provider, model, error_type: errorType });
	}

	// Connection pool metrics methods
	updateConnectionPoolSize(provider: string, state: 'active' | 'idle' | 'acquiring', size: number): void {
		this.connectionPoolSize.set({ provider, state }, size);
	}

	recordConnectionAcquired(provider: string, waitTime: number): void {
		this.connectionAcquires.inc({ provider, result: 'success' });
		this.connectionWaitTime.observe({ provider }, waitTime);
	}

	recordConnectionAcquireFailed(provider: string): void {
		this.connectionAcquires.inc({ provider, result: 'failed' });
	}

	// MCP tool metrics methods
	recordMcpToolInvocation(
		toolName: string,
		status: 'success' | 'error',
		errorType?: string,
		duration?: number,
	): void {
		this.mcpToolInvocations.inc({ tool_name: toolName, status, error_type: errorType || 'none' });
		if (duration !== undefined) {
			this.mcpToolDuration.observe({ tool_name: toolName }, duration);
		}
	}

	// Circuit breaker metrics methods
	updateCircuitBreakerState(circuitBreakerName: string, state: 'closed' | 'open' | 'half-open'): void {
		const stateValue = state === 'closed' ? 0 : state === 'open' ? 1 : 2;
		this.circuitBreakerState.set({ circuit_breaker_name: circuitBreakerName }, stateValue);
	}

	recordCircuitBreakerRequest(circuitBreakerName: string, result: 'success' | 'rejected' | 'error'): void {
		this.circuitBreakerRequests.inc({ circuit_breaker_name, result });
	}

	// Queue metrics methods
	updateQueueSize(queueName: string, priority: string, size: number): void {
		this.queueSize.set({ queue_name: queueName, priority }, size);
	}

	recordQueueWaitTime(queueName: string, priority: string, waitTime: number): void {
		this.queueWaitTime.observe({ queue_name: queueName, priority }, waitTime);
	}

	// Get metrics in Prometheus format
	async getMetrics(): Promise<string> {
		return this.registry.metrics();
	}

	// Reset all metrics (for testing)
	reset(): void {
		this.registry.reset();
	}
}

// Global metrics instance
export const orchestrationMetrics = new OrchestrationMetrics();