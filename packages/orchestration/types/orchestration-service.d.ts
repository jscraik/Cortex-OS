export interface OrchestrationService {
  getConnectionCount(): Promise<number>;
  getMetrics(): Promise<Record<string, unknown>>;
  listAgents(): Promise<Record<string, unknown>[]>;
  getAgentMetrics(agentId: string, request?: Record<string, unknown>): Promise<Record<string, unknown>>;
  createWorkflow(payload: Record<string, unknown>): Promise<Record<string, unknown>>;
  listWorkflows(filter?: Record<string, unknown>): Promise<Record<string, unknown>[]>;
  getWorkflow(id: string): Promise<Record<string, unknown> | null>;
  updateWorkflow(id: string, patch: Record<string, unknown>): Promise<Record<string, unknown>>;
  cancelWorkflow(id: string): Promise<Record<string, unknown>>;
  listTasks(filter?: Record<string, unknown>): Promise<Record<string, unknown>[]>;
  createTask(payload: Record<string, unknown>): Promise<Record<string, unknown>>;
  getTask(id: string): Promise<Record<string, unknown> | null>;
  updateTaskStatus(id: string, status: string, message?: string): Promise<Record<string, unknown>>;
  updateTask(id: string, patch: Record<string, unknown>): Promise<Record<string, unknown>>;
}
