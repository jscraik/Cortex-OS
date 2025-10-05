import type { Agent, Task, TaskStatus } from '../types.js';

export interface OrchestrationService {
	getConnectionCount(): Promise<number>;
	getMetrics(): Promise<unknown>;
	listAgents(): Promise<unknown[]>;
	getAgentMetrics(agentId: string, request: Record<string, unknown>): Promise<unknown>;
	createWorkflow(input: Record<string, unknown>): Promise<unknown>;
	listWorkflows(request: Record<string, unknown>): Promise<unknown>;
	getWorkflow(id: string): Promise<unknown>;
	updateWorkflow(id: string, update: Record<string, unknown>): Promise<unknown>;
	cancelWorkflow(id: string): Promise<void>;
	listTasks(request: Record<string, unknown>): Promise<unknown>;
	createTask(input: Record<string, unknown>): Promise<unknown>;
	getTask(id: string): Promise<unknown>;
	updateTaskStatus(id: string, status: TaskStatus, message?: string): Promise<unknown>;
	updateTask(id: string, update: Record<string, unknown>): Promise<unknown>;
	executeTask(task: Task, agents: Agent[]): Promise<unknown>;
}
