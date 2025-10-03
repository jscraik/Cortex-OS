/**
 * Custom Metrics Implementation for Orchestration
 * Provides comprehensive metrics collection and reporting
 */
import { Counter, Gauge, Histogram, Registry } from 'prom-client';
export declare class OrchestrationMetrics {
	private readonly registry;
	readonly workflowsCreated: Counter;
	readonly workflowsCompleted: Counter;
	readonly workflowDuration: Histogram;
	readonly activeWorkflows: Gauge;
	readonly tasksCreated: Counter;
	readonly tasksCompleted: Counter;
	readonly taskDuration: Histogram;
	readonly activeTasks: Gauge;
	readonly agentRegistrations: Counter;
	readonly agentExecutions: Counter;
	readonly agentExecutionDuration: Histogram;
	readonly agentPoolSize: Gauge;
	readonly agentUtilization: Gauge;
	readonly modelRequests: Counter;
	readonly modelLatency: Histogram;
	readonly modelTokens: Counter;
	readonly modelErrors: Counter;
	readonly connectionPoolSize: Gauge;
	readonly connectionAcquires: Counter;
	readonly connectionWaitTime: Histogram;
	readonly mcpToolInvocations: Counter;
	readonly mcpToolDuration: Histogram;
	readonly plannerPersistenceEvents: Counter;
	readonly plannerPersistenceDuration: Histogram;
	readonly circuitBreakerState: Gauge;
	readonly circuitBreakerRequests: Counter;
	readonly queueSize: Gauge;
	readonly queueWaitTime: Histogram;
	constructor(registry?: Registry);
	recordWorkflowCreated(strategy: string, priority: string): void;
	recordWorkflowCompleted(
		strategy: string,
		status: string,
		result: 'success' | 'failure' | 'cancelled',
		duration: number,
	): void;
	recordTaskCreated(workflowId: string, status: string, priority: string): void;
	recordTaskCompleted(
		workflowId: string,
		agentRole: string,
		status: string,
		result: 'success' | 'failure',
		duration: number,
	): void;
	recordAgentRegistered(agentRole: string, agentType: string): void;
	recordAgentExecution(
		agentId: string,
		agentRole: string,
		status: string,
		taskType: string,
		duration: number,
	): void;
	updateAgentUtilization(agentId: string, agentRole: string, utilization: number): void;
	recordModelRequest(
		provider: string,
		model: string,
		operation: string,
		status: 'success' | 'error',
		latency: number,
	): void;
	recordModelTokens(
		provider: string,
		model: string,
		tokenType: 'input' | 'output',
		count: number,
	): void;
	recordModelError(provider: string, model: string, errorType: string): void;
	updateConnectionPoolSize(
		provider: string,
		state: 'active' | 'idle' | 'acquiring',
		size: number,
	): void;
	recordConnectionAcquired(provider: string, waitTime: number): void;
	recordConnectionAcquireFailed(provider: string): void;
	recordMcpToolInvocation(
		toolName: string,
		status: 'success' | 'error',
		errorType?: string,
		duration?: number,
	): void;
	recordPlannerPersistenceEvent(
		eventType: string,
		status: 'success' | 'error',
		errorType?: string,
		durationSeconds?: number,
	): void;
	updateCircuitBreakerState(
		circuitBreakerName: string,
		state: 'closed' | 'open' | 'half-open',
	): void;
	recordCircuitBreakerRequest(
		circuitBreakerName: string,
		result: 'success' | 'rejected' | 'error',
	): void;
	getMetrics(): Promise<string>;
	reset(): void;
}
export declare const orchestrationMetrics: OrchestrationMetrics;
//# sourceMappingURL=custom-metrics.d.ts.map
