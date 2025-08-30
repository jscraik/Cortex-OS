/**
 * Agent Orchestration Layer
 *
 * Functional implementation for coordinating multi-agent workflows
 * No custom classes - pure functional approach
 */

import { z } from 'zod';
import type { Agent, ModelProvider, EventBus, MCPClient } from '../lib/types.js';
// Avoid circular import by importing agents directly
import { createCodeAnalysisAgent } from '../agents/code-analysis-agent.js';
import { createTestGenerationAgent } from '../agents/test-generation-agent.js';
import { createDocumentationAgent } from '../agents/documentation-agent.js';
import { createSecurityAgent } from '../agents/security-agent.js';
import { generateAgentId, generateTraceId, withTimeout } from '../lib/utils.js';

// Orchestration schemas
export const workflowTaskSchema = z.object({
  id: z.string(),
  agentType: z.enum(['code-analysis', 'test-generation', 'documentation', 'security']),
  input: z.any(),
  dependsOn: z.array(z.string()).optional().default([]),
  timeout: z.number().optional().default(30000),
  retries: z.number().optional().default(3),
  priority: z.enum(['low', 'medium', 'high']).optional().default('medium'),
});

export const workflowSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  tasks: z.array(workflowTaskSchema),
  parallel: z.boolean().optional().default(false),
  timeout: z.number().optional().default(300000),
});

export const orchestrationResultSchema = z.object({
  workflowId: z.string(),
  status: z.enum(['completed', 'failed', 'timeout', 'cancelled']),
  results: z.record(z.string(), z.any()),
  errors: z.record(z.string(), z.string()).optional(),
  metrics: z.object({
    totalTime: z.number(),
    tasksCompleted: z.number(),
    tasksTotal: z.number(),
    agentsUsed: z.array(z.string()),
  }),
  timestamp: z.string(),
});

export type WorkflowTask = z.infer<typeof workflowTaskSchema>;
export type Workflow = z.infer<typeof workflowSchema>;
export type OrchestrationResult = z.infer<typeof orchestrationResultSchema>;

export interface OrchestratorConfig {
  providers: {
    primary: ModelProvider;
    fallback?: ModelProvider;
  };
  eventBus: EventBus;
  mcpClient: MCPClient;
  maxConcurrentTasks?: number;
  enableMetrics?: boolean;
}

interface OrchestratorState {
  agents: Map<string, Agent<any, any>>;
  config: Required<OrchestratorConfig>;
  activeWorkflows: Map<string, Promise<OrchestrationResult>>;
  runningTasks: Set<string>;
  metrics: {
    workflowsExecuted: number;
    tasksCompleted: number;
    totalExecutionTime: number;
    averageTaskTime: number;
  };
}

const createOrchestratorState = (config: OrchestratorConfig): OrchestratorState => {
  const fullConfig = {
    maxConcurrentTasks: 3,
    enableMetrics: true,
    ...config,
  };

  const state: OrchestratorState = {
    agents: new Map(),
    config: fullConfig,
    activeWorkflows: new Map(),
    runningTasks: new Set(),
    metrics: {
      workflowsExecuted: 0,
      tasksCompleted: 0,
      totalExecutionTime: 0,
      averageTaskTime: 0,
    },
  };

  initializeAgents(state);
  return state;
};

const initializeAgents = (state: OrchestratorState): void => {
  const agentConfig = {
    provider: state.config.providers.primary,
    eventBus: state.config.eventBus,
    mcpClient: state.config.mcpClient,
  };

  state.agents.set('code-analysis', createCodeAnalysisAgent(agentConfig));
  state.agents.set('test-generation', createTestGenerationAgent(agentConfig));
  state.agents.set('documentation', createDocumentationAgent(agentConfig));
  state.agents.set('security', createSecurityAgent(agentConfig as any));
};

const executeTask = async (task: WorkflowTask, state: OrchestratorState): Promise<any> => {
  const agent = state.agents.get(task.agentType);
  if (!agent) {
    throw new Error(`Agent not found for type: ${task.agentType}`);
  }

  state.runningTasks.add(task.id);

  try {
    const result = await withTimeout(
      agent.execute(task.input),
      task.timeout,
      `Task ${task.id} timed out after ${task.timeout}ms`,
    );

    if (state.config.enableMetrics) {
      state.metrics.tasksCompleted++;
    }

    return result;
  } finally {
    state.runningTasks.delete(task.id);
  }
};

const executeTasksInParallel = async (
  tasks: WorkflowTask[],
  results: Record<string, any>,
  errors: Record<string, string>,
  state: OrchestratorState,
): Promise<void> => {
  const taskPromises = tasks.map((task) => executeTask(task, state));
  const taskResults = await Promise.allSettled(taskPromises);

  taskResults.forEach((result, index) => {
    const task = tasks[index];
    if (result.status === 'fulfilled') {
      results[task.id] = result.value;
    } else {
      errors[task.id] = result.reason?.message || 'Task failed';
    }
  });
};

const canExecuteTask = (task: WorkflowTask, completed: Set<string>): boolean =>
  task.dependsOn.every((depId) => completed.has(depId));

const executeTasksSequentially = async (
  tasks: WorkflowTask[],
  results: Record<string, any>,
  errors: Record<string, string>,
  state: OrchestratorState,
): Promise<void> => {
  const completed = new Set<string>();
  const inProgress = new Set<string>();

  while (completed.size < tasks.length && Object.keys(errors).length === 0) {
    const executableTasks = tasks.filter(
      (task) =>
        !completed.has(task.id) && !inProgress.has(task.id) && canExecuteTask(task, completed),
    );

    if (executableTasks.length === 0) {
      const remaining = tasks.filter((task) => !completed.has(task.id));
      if (remaining.length > 0) {
        errors['dependency'] = 'Circular dependency or missing dependency detected';
        break;
      }
      break;
    }

    const tasksToExecute = executableTasks.slice(0, state.config.maxConcurrentTasks);

    const taskPromises = tasksToExecute.map(async (task) => {
      inProgress.add(task.id);
      try {
        const result = await executeTask(task, state);
        results[task.id] = result;
        completed.add(task.id);
      } catch (error) {
        errors[task.id] = error instanceof Error ? error.message : 'Task failed';
      } finally {
        inProgress.delete(task.id);
      }
    });

    await Promise.all(taskPromises);
  }
};

const executeWorkflowInternal = async (
  workflow: Workflow,
  startTime: number,
  state: OrchestratorState,
): Promise<OrchestrationResult> => {
  const results: Record<string, any> = {};
  const errors: Record<string, string> = {};
  let status: OrchestrationResult['status'] = 'completed';

  try {
    if (workflow.parallel) {
      await executeTasksInParallel(workflow.tasks, results, errors, state);
    } else {
      await executeTasksSequentially(workflow.tasks, results, errors, state);
    }

    if (Object.keys(errors).length > 0) {
      status = 'failed';
    }
  } catch (error) {
    status = 'timeout';
    errors['workflow'] = error instanceof Error ? error.message : 'Unknown error';
  }

  const totalTime = Math.max(1, Date.now() - startTime);

  const result: OrchestrationResult = {
    workflowId: workflow.id,
    status,
    results,
    errors: Object.keys(errors).length > 0 ? errors : undefined,
    metrics: {
      totalTime,
      tasksCompleted: Object.keys(results).length,
      tasksTotal: workflow.tasks.length,
      agentsUsed: Array.from(new Set(workflow.tasks.map((t) => t.agentType))),
    },
    timestamp: new Date().toISOString(),
  };

  state.config.eventBus.publish({
    type: 'workflow.completed' as any,
    data: {
      workflowId: workflow.id,
      status,
      metrics: result.metrics,
      timestamp: result.timestamp,
    },
  });

  return result;
};

const updateMetrics = (result: OrchestrationResult, state: OrchestratorState): void => {
  if (!state.config.enableMetrics) return;

  state.metrics.workflowsExecuted++;
  state.metrics.totalExecutionTime += result.metrics.totalTime;
  state.metrics.averageTaskTime =
    state.metrics.totalExecutionTime / Math.max(state.metrics.tasksCompleted, 1);
};

export const executeWorkflow = async (
  workflow: Workflow,
  state: OrchestratorState,
): Promise<OrchestrationResult> => {
  const startTime = Date.now();
  const workflowId = workflow.id;

  const validatedWorkflow = workflowSchema.parse(workflow);

  if (state.activeWorkflows.has(workflowId)) {
    throw new Error(`Workflow ${workflowId} is already running`);
  }

  state.config.eventBus.publish({
    type: 'workflow.started' as any,
    data: {
      workflowId,
      name: workflow.name,
      tasksCount: workflow.tasks.length,
      timestamp: new Date().toISOString(),
    },
  });

  const workflowPromise = executeWorkflowInternal(validatedWorkflow, startTime, state);
  state.activeWorkflows.set(workflowId, workflowPromise);

  try {
    const result = await workflowPromise;
    updateMetrics(result, state);
    return result;
  } finally {
    state.activeWorkflows.delete(workflowId);
  }
};

export const getWorkflowStatus = (
  workflowId: string,
  state: OrchestratorState,
): {
  isRunning: boolean;
  tasksCompleted?: number;
  tasksTotal?: number;
  runningTasks?: string[];
} => {
  const isRunning = state.activeWorkflows.has(workflowId);
  if (!isRunning) {
    return { isRunning: false };
  }

  return {
    isRunning: true,
    runningTasks: Array.from(state.runningTasks),
  };
};

export const cancelWorkflow = async (
  workflowId: string,
  state: OrchestratorState,
): Promise<boolean> => {
  if (!state.activeWorkflows.has(workflowId)) {
    return false;
  }

  state.config.eventBus.publish({
    type: 'workflow.cancelled' as any,
    data: {
      workflowId,
      timestamp: new Date().toISOString(),
    },
  });

  return true;
};

export const getMetrics = (state: OrchestratorState): typeof state.metrics => ({
  ...state.metrics,
});

export const getAvailableAgents = (
  state: OrchestratorState,
): Array<{ type: string; capability: string }> =>
  Array.from(state.agents.entries()).map(([type, agent]) => ({
    type,
    capability: agent.capability,
  }));

export const shutdownOrchestrator = (state: OrchestratorState): void => {
  for (const workflowId of state.activeWorkflows.keys()) {
    cancelWorkflow(workflowId, state);
  }

  state.runningTasks.clear();
  state.agents.clear();
};

export const createOrchestrator = (config: OrchestratorConfig) => {
  const state = createOrchestratorState(config);

  return {
    executeWorkflow: (workflow: Workflow) => executeWorkflow(workflow, state),
    getWorkflowStatus: (workflowId: string) => getWorkflowStatus(workflowId, state),
    cancelWorkflow: (workflowId: string) => cancelWorkflow(workflowId, state),
    getMetrics: () => getMetrics(state),
    getAvailableAgents: () => getAvailableAgents(state),
    shutdown: () => shutdownOrchestrator(state),
  };
};

export type AgentOrchestrator = ReturnType<typeof createOrchestrator>;

// Workflow Builder - Functional Implementation
export const createWorkflowBuilder = (id: string, name: string) => {
  const workflow: Partial<Workflow> = {
    id,
    name,
    tasks: [],
    parallel: false,
  };

  const api = {
    description(desc: string) {
      workflow.description = desc;
      return api;
    },
    parallel(enabled: boolean = true) {
      workflow.parallel = enabled;
      return api;
    },
    timeout(ms: number) {
      workflow.timeout = ms;
      return api;
    },
    addTask(task: Omit<WorkflowTask, 'id'> & { id?: string }) {
      const taskId = task.id || generateAgentId();
      (workflow.tasks as WorkflowTask[]).push({ ...task, id: taskId } as WorkflowTask);
      return api;
    },
    addCodeAnalysis(input: any, options?: Partial<WorkflowTask>) {
      return api.addTask({ agentType: 'code-analysis', input, ...options } as any);
    },
    addTestGeneration(input: any, options?: Partial<WorkflowTask>) {
      return api.addTask({ agentType: 'test-generation', input, ...options } as any);
    },
    addDocumentation(input: any, options?: Partial<WorkflowTask>) {
      return api.addTask({ agentType: 'documentation', input, ...options } as any);
    },
    addSecurity(input: any, options?: Partial<WorkflowTask>) {
      return api.addTask({ agentType: 'security', input, ...options } as any);
    },
    build(): Workflow {
      if (!workflow.id || !workflow.name) {
        throw new Error('Workflow ID and name are required');
      }
      return workflowSchema.parse(workflow);
    },
  };

  return api;
};

export const WorkflowBuilder = {
  create: createWorkflowBuilder,
};
