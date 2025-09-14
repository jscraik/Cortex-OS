/**
 * Archon Task Manager Integration for Orchestration Package
 *
 * Provides async task coordination with Archon's task management system,
 * enabling long-running workflows to be tracked and managed externally.
 */

// Minimal event bus contract (publish only) to avoid reach-through dependency on full bus internals
export interface EventBus {
  publish(msg: {
    type: string;
    source: string;
    data: unknown;
    timestamp: string;
  }): Promise<void>;
}

import type {
  AgentMCPClient,
  ArchonIntegrationConfig,
  Priority,
  TaskStatus,
} from '@cortex-os/agents';
import { createAgentMCPClient } from '@cortex-os/agents';

export interface ArchonTaskManagerConfig extends ArchonIntegrationConfig {
  enableTaskTracking?: boolean;
  enableProgressUpdates?: boolean;
  taskUpdateInterval?: number;
  maxConcurrentTasks?: number;
}

export interface OrchestrationTask {
  id: string;
  title: string;
  description: string;
  type: 'workflow' | 'agent-execution' | 'batch-processing' | 'data-pipeline';
  status: TaskStatus;
  priority: Priority;
  workflow?: {
    id: string;
    steps: WorkflowStep[];
  };
  progress?: {
    current: number;
    total: number;
    percentage: number;
    message?: string;
  };
  archonTaskId?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface WorkflowStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  agentId?: string;
  startedAt?: string;
  completedAt?: string;
  result?: unknown;
}

export interface TaskManagerEvents {
  'task.created': { task: OrchestrationTask };
  'task.updated': { task: OrchestrationTask; previousStatus: TaskStatus };
  'task.progress': { taskId: string; progress: OrchestrationTask['progress'] };
  'task.completed': { task: OrchestrationTask; result?: unknown };
  'task.failed': { task: OrchestrationTask; error: string };
  'archon.sync.success': { taskId: string; archonTaskId: string };
  'archon.sync.failed': { taskId: string; error: string };
}

/**
 * Archon-integrated task manager for orchestration workflows
 */
export class ArchonTaskManager {
  private readonly mcpClient: AgentMCPClient;
  private readonly tasks = new Map<string, OrchestrationTask>();
  private readonly config: ArchonTaskManagerConfig;
  private readonly eventBus?: EventBus;
  private updateInterval?: NodeJS.Timeout;

  constructor(config: ArchonTaskManagerConfig, eventBus?: EventBus) {
    this.config = config;
    this.eventBus = eventBus;
    this.mcpClient = createAgentMCPClient(config);

    // Set up periodic task updates
    if (config.enableProgressUpdates) {
      this.startProgressUpdates();
    }
  }

  /**
   * Initialize the task manager and MCP connection
   */
  async initialize(): Promise<void> {
    await this.mcpClient.initialize();
    console.warn('[Archon Task Manager] Initialized with MCP connection');
  }

  /**
   * Create a new orchestration task
   */
  async createTask(
    title: string,
    description: string,
    options: {
      type?: OrchestrationTask['type'];
      priority?: Priority;
      metadata?: Record<string, unknown>;
      syncToArchon?: boolean;
    } = {},
  ): Promise<OrchestrationTask> {
    const task: OrchestrationTask = {
      id: this.generateTaskId(),
      title,
      description,
      type: options.type || 'workflow',
      status: 'open',
      priority: options.priority || 'medium',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: options.metadata,
    };

    this.tasks.set(task.id, task);

    // Sync to Archon if enabled
    if (this.config.enableTaskTracking && options.syncToArchon !== false) {
      try {
        const archonResult = await this.mcpClient.createTask(
          title,
          description,
          {
            priority: options.priority,
            tags: ['cortex-orchestration', task.type],
          },
        );

        task.archonTaskId = archonResult.taskId;
        this.tasks.set(task.id, task);

        await this.emitEvent('archon.sync.success', {
          taskId: task.id,
          archonTaskId: archonResult.taskId,
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(
          `[Archon Task Manager] Failed to sync task to Archon: ${errorMsg}`,
        );
        await this.emitEvent('archon.sync.failed', {
          taskId: task.id,
          error: errorMsg,
        });
      }
    }

    await this.emitEvent('task.created', { task });
    return task;
  }

  /**
   * Update task status
   */
  async updateTaskStatus(
    taskId: string,
    status: TaskStatus,
    options: {
      message?: string;
      result?: unknown;
      syncToArchon?: boolean;
    } = {},
  ): Promise<OrchestrationTask | undefined> {
    const task = this.tasks.get(taskId);
    if (!task) {
      console.error(`[Archon Task Manager] Task not found: ${taskId}`);
      return undefined;
    }

    const previousStatus = task.status;
    task.status = status;
    task.updatedAt = new Date().toISOString();

    if (options.message && task.progress) {
      task.progress.message = options.message;
    }

    this.tasks.set(taskId, task);

    // Sync to Archon if enabled and task has Archon ID
    if (
      this.config.enableTaskTracking &&
      task.archonTaskId &&
      options.syncToArchon !== false
    ) {
      try {
        await this.mcpClient.updateTaskStatus(
          task.archonTaskId,
          status,
          options.message,
        );
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(
          `[Archon Task Manager] Failed to update Archon task: ${errorMsg}`,
        );
      }
    }

    await this.emitEvent('task.updated', { task, previousStatus });

    if (status === 'completed') {
      await this.emitEvent('task.completed', { task, result: options.result });
    } else if (status === 'cancelled' && options.message) {
      await this.emitEvent('task.failed', { task, error: options.message });
    }

    return task;
  }

  /**
   * Update task progress
   */
  async updateTaskProgress(
    taskId: string,
    progress: OrchestrationTask['progress'],
  ): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      console.error(`[Archon Task Manager] Task not found: ${taskId}`);
      return;
    }

    task.progress = progress;
    task.updatedAt = new Date().toISOString();
    this.tasks.set(taskId, task);

    await this.emitEvent('task.progress', { taskId, progress });
  }

  /**
   * Add workflow step to task
   */
  async addWorkflowStep(taskId: string, step: WorkflowStep): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      console.error(`[Archon Task Manager] Task not found: ${taskId}`);
      return;
    }

    // Initialize workflow container if absent (nullish coalescing keeps any existing structure)
    task.workflow ??= { id: `workflow-${taskId}`, steps: [] };

    task.workflow.steps.push(step);
    task.updatedAt = new Date().toISOString();
    this.tasks.set(taskId, task);
  }

  /**
   * Update workflow step status
   */
  async updateWorkflowStep(
    taskId: string,
    stepId: string,
    updates: Partial<WorkflowStep>,
  ): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task?.workflow) {
      console.error(
        `[Archon Task Manager] Task or workflow not found: ${taskId}`,
      );
      return;
    }

    const stepIndex = task.workflow.steps.findIndex((s) => s.id === stepId);
    if (stepIndex === -1) {
      console.error(`[Archon Task Manager] Workflow step not found: ${stepId}`);
      return;
    }

    task.workflow.steps[stepIndex] = {
      ...task.workflow.steps[stepIndex],
      ...updates,
    };
    task.updatedAt = new Date().toISOString();
    this.tasks.set(taskId, task);

    // Update overall task progress based on workflow steps
    await this.updateTaskProgressFromWorkflow(taskId);
  }

  /**
   * Get task by ID
   */
  getTask(taskId: string): OrchestrationTask | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Get all tasks
   */
  getAllTasks(): OrchestrationTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Get tasks by status
   */
  getTasksByStatus(status: TaskStatus): OrchestrationTask[] {
    return this.getAllTasks().filter((task) => task.status === status);
  }

  /**
   * Get active tasks (not completed or cancelled)
   */
  getActiveTasks(): OrchestrationTask[] {
    return this.getAllTasks().filter(
      (task) => task.status !== 'completed' && task.status !== 'cancelled',
    );
  }

  /**
   * Remove completed tasks older than specified days
   */
  async cleanupOldTasks(olderThanDays = 7): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const tasksToRemove: string[] = [];

    for (const [id, task] of this.tasks) {
      if (
        (task.status === 'completed' || task.status === 'cancelled') &&
        new Date(task.updatedAt) < cutoffDate
      ) {
        tasksToRemove.push(id);
      }
    }

    for (const id of tasksToRemove) {
      this.tasks.delete(id);
    }

    return tasksToRemove.length;
  }

  /**
   * Shutdown task manager and cleanup resources
   */
  async shutdown(): Promise<void> {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    await this.mcpClient.disconnect();
    console.warn('[Archon Task Manager] Shutdown complete');
  }

  private generateTaskId(): string {
    return `task-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private startProgressUpdates(): void {
    const interval = this.config.taskUpdateInterval || 30000; // 30 seconds
    this.updateInterval = setInterval(() => {
      this.syncProgressWithArchon().catch((error) => {
        console.error('[Archon Task Manager] Progress sync failed:', error);
      });
    }, interval);
  }

  private async syncProgressWithArchon(): Promise<void> {
    if (!this.config.enableTaskTracking) return;

    const activeTasks = this.getActiveTasks().filter((t) => t.archonTaskId);

    for (const task of activeTasks) {
      try {
        // This would query Archon for task status updates
        // For now, we'll just emit a progress event
        if (task.progress) {
          await this.emitEvent('task.progress', {
            taskId: task.id,
            progress: task.progress,
          });
        }
      } catch (error) {
        console.error(
          `[Archon Task Manager] Failed to sync progress for task ${task.id}:`,
          error,
        );
      }
    }
  }

  private async updateTaskProgressFromWorkflow(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task?.workflow) return;

    const steps = task.workflow.steps;
    const totalSteps = steps.length;
    const completedSteps = steps.filter((s) => s.status === 'completed').length;
    const failedSteps = steps.filter((s) => s.status === 'failed').length;

    const progress = {
      current: completedSteps,
      total: totalSteps,
      percentage:
        totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0,
      message:
        failedSteps > 0
          ? `${completedSteps}/${totalSteps} completed, ${failedSteps} failed`
          : `${completedSteps}/${totalSteps} completed`,
    };

    await this.updateTaskProgress(taskId, progress);

    // Update overall task status based on workflow completion
    if (completedSteps === totalSteps && failedSteps === 0) {
      await this.updateTaskStatus(taskId, 'completed');
    } else if (failedSteps > 0) {
      await this.updateTaskStatus(taskId, 'blocked');
    } else if (completedSteps > 0) {
      await this.updateTaskStatus(taskId, 'in_progress');
    }
  }

  private async emitEvent<K extends keyof TaskManagerEvents>(
    eventType: K,
    eventData: TaskManagerEvents[K],
  ): Promise<void> {
    if (this.eventBus) {
      try {
        await this.eventBus.publish({
          type: `orchestration.${eventType}`,
          source: 'cortex-orchestration',
          data: eventData,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error(
          `[Archon Task Manager] Failed to emit event ${eventType}:`,
          error,
        );
      }
    }
  }
}

/**
 * Create configured Archon task manager
 */
export function createArchonTaskManager(
  config: ArchonTaskManagerConfig,
  eventBus?: EventBus,
): ArchonTaskManager {
  return new ArchonTaskManager(config, eventBus);
}

/**
 * Integration middleware for existing orchestration workflows
 */
export class OrchestrationArchonIntegration {
  private readonly taskManager: ArchonTaskManager;

  constructor(taskManager: ArchonTaskManager) {
    this.taskManager = taskManager;
  }

  /**
   * Wrap workflow execution with task tracking
   */
  async executeWithTracking<T>(
    workflowName: string,
    workflowDescription: string,
    executor: (
      taskId: string,
      updateProgress: (
        current: number,
        total: number,
        message?: string,
      ) => Promise<void>,
    ) => Promise<T>,
    options: {
      priority?: Priority;
      metadata?: Record<string, unknown>;
    } = {},
  ): Promise<{ result: T; task: OrchestrationTask }> {
    // Create task
    const task = await this.taskManager.createTask(
      workflowName,
      workflowDescription,
      {
        type: 'workflow',
        priority: options.priority,
        metadata: options.metadata,
      },
    );

    try {
      // Update to in-progress
      await this.taskManager.updateTaskStatus(task.id, 'in_progress');

      // Progress update function
      const updateProgress = async (
        current: number,
        total: number,
        message?: string,
      ) => {
        await this.taskManager.updateTaskProgress(task.id, {
          current,
          total,
          percentage: Math.round((current / total) * 100),
          message,
        });
      };

      // Execute workflow
      const result = await executor(task.id, updateProgress);

      // Mark as completed
      await this.taskManager.updateTaskStatus(task.id, 'completed', {
        result,
      });

      return { result, task };
    } catch (error) {
      // Mark as failed
      const errorMsg = error instanceof Error ? error.message : String(error);
      await this.taskManager.updateTaskStatus(task.id, 'cancelled', {
        message: errorMsg,
      });
      throw error;
    }
  }
}

/**
 * Create orchestration integration wrapper
 */
export function createOrchestrationArchonIntegration(
  config: ArchonTaskManagerConfig,
  eventBus?: EventBus,
): OrchestrationArchonIntegration {
  const taskManager = createArchonTaskManager(config, eventBus);
  return new OrchestrationArchonIntegration(taskManager);
}
