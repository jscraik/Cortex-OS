/**
 * @fileoverview Master Agent Loop Core for nO Architecture
 * @module MasterAgentLoopCore
 * @description Central coordination engine that orchestrates all nO architecture components
 * @author brAInwav Development Team
 * @version 2.5.0
 * @since 2024-12-09
 */

import { SpanStatusCode, trace } from '@opentelemetry/api';
import { EventEmitter } from 'events';
import { z } from 'zod';

// Import component managers
import type { AgentPoolManager } from './agent-pool-manager';
import type { FailureRecoveryResilienceManager } from './failure-recovery-resilience-manager';
import type { LearningSystemIntegrationManager } from './learning-system-integration-manager';
import type { StatePersistenceManager } from './state-persistence-manager';

/**
 * Simple workflow schema for master agent loop
 */
const WorkflowSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  steps: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      type: z.string().min(1),
      action: z.record(z.unknown()),
      timeout: z.number().optional(),
      priority: z.number().optional(),
    }),
  ),
  priority: z.number().optional(),
  timeout: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Master Agent Loop configuration
 */
export const MasterAgentLoopConfigSchema = z.object({
  coordinationEnabled: z.boolean().default(true),
  coordinationInterval: z.number().min(1000).default(30000),
  maxConcurrentWorkflows: z.number().min(1).default(10),
  workflowTimeout: z.number().min(1000).default(300000),
  agentPoolEnabled: z.boolean().default(true),
  statePersistenceEnabled: z.boolean().default(true),
  failureRecoveryEnabled: z.boolean().default(true),
  learningSystemEnabled: z.boolean().default(true),
  orchestrationMode: z.enum(['sequential', 'parallel', 'adaptive']).default('adaptive'),
  metricsEnabled: z.boolean().default(true),
  healthCheckEnabled: z.boolean().default(true),
});

export type MasterAgentLoopConfig = z.infer<typeof MasterAgentLoopConfigSchema>;

/**
 * Workflow execution context
 */
export const WorkflowExecutionContextSchema = z.object({
  workflowId: z.string().min(1),
  executionId: z.string().min(1),
  priority: z.number().min(0).max(10).default(5),
  timeout: z.number().min(1000).optional(),
  metadata: z.record(z.unknown()).default({}),
  startedAt: z.date(),
  updatedAt: z.date(),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']),
  assignedAgents: z.array(z.string()).default([]),
  checkpointIds: z.array(z.string()).default([]),
});

export type WorkflowExecutionContext = z.infer<typeof WorkflowExecutionContextSchema>;

/**
 * System health status
 */
export const SystemHealthSchema = z.object({
  overall: z.enum(['healthy', 'degraded', 'critical', 'offline']),
  components: z.object({
    agentPool: z.enum(['healthy', 'degraded', 'critical', 'offline']),
    statePersistence: z.enum(['healthy', 'degraded', 'critical', 'offline']),
    failureRecovery: z.enum(['healthy', 'degraded', 'critical', 'offline']),
    learningSystem: z.enum(['healthy', 'degraded', 'critical', 'offline']),
  }),
  metrics: z.object({
    activeWorkflows: z.number().min(0),
    totalExecutions: z.number().min(0),
    successRate: z.number().min(0).max(1),
    averageExecutionTime: z.number().min(0),
    systemLoad: z.number().min(0).max(1),
  }),
  lastHealthCheck: z.date(),
});

export type SystemHealth = z.infer<typeof SystemHealthSchema>;

/**
 * Master Agent Loop Core - Central coordination engine for nO architecture
 */
export class MasterAgentLoopCore extends EventEmitter {
  private readonly tracer = trace.getTracer('nO-master-agent-loop-core');
  private readonly config: MasterAgentLoopConfig;

  // Component managers
  private readonly agentPoolManager?: AgentPoolManager;
  private readonly statePersistenceManager?: StatePersistenceManager;
  private readonly failureRecoveryManager?: FailureRecoveryResilienceManager;
  private readonly learningSystemManager?: LearningSystemIntegrationManager;

  // State management
  private readonly activeWorkflows = new Map<string, WorkflowExecutionContext>();
  private readonly workflowQueue: WorkflowExecutionContext[] = [];
  private readonly executionHistory: Array<{
    context: WorkflowExecutionContext;
    result: 'success' | 'failure' | 'timeout';
    duration: number;
    timestamp: Date;
  }> = [];

  private readonly systemHealth: SystemHealth;
  private coordinationTimer: NodeJS.Timeout | null = null;
  private isShuttingDown = false;

  constructor(
    config: Partial<MasterAgentLoopConfig> = {},
    components?: {
      agentPoolManager?: AgentPoolManager;
      statePersistenceManager?: StatePersistenceManager;
      failureRecoveryManager?: FailureRecoveryResilienceManager;
      learningSystemManager?: LearningSystemIntegrationManager;
    },
  ) {
    super();
    this.config = MasterAgentLoopConfigSchema.parse(config);

    // Initialize component managers (optional injection for testing)
    this.agentPoolManager = components?.agentPoolManager;
    this.statePersistenceManager = components?.statePersistenceManager;
    this.failureRecoveryManager = components?.failureRecoveryManager;
    this.learningSystemManager = components?.learningSystemManager;

    // Initialize system health
    const initialComponents = {
      agentPool: this.agentPoolManager ? 'healthy' : 'offline',
      statePersistence: this.statePersistenceManager ? 'healthy' : 'offline',
      failureRecovery: this.failureRecoveryManager ? 'healthy' : 'offline',
      learningSystem: this.learningSystemManager ? 'healthy' : 'offline',
    } as const;
    const allOffline = Object.values(initialComponents).every((s) => s === 'offline');
    this.systemHealth = {
      overall: allOffline ? 'offline' : 'healthy',
      components: initialComponents,
      metrics: {
        activeWorkflows: 0,
        totalExecutions: 0,
        successRate: 1.0,
        averageExecutionTime: 0,
        systemLoad: 0,
      },
      lastHealthCheck: new Date(),
    };

    this.startPeriodicTasks();
  }

  /**
   * Execute a workflow through the coordinated system
   */
  async executeWorkflow(workflow: z.infer<typeof WorkflowSchema>): Promise<string> {
    return this.tracer.startActiveSpan('master-agent-loop.execute-workflow', async (span) => {
      try {
        if (!this.config.coordinationEnabled) {
          throw new Error('Master Agent Loop coordination is disabled');
        }

        const validatedWorkflow = WorkflowSchema.parse(workflow);

        const executionId = `exec-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
        const context: WorkflowExecutionContext = {
          workflowId: validatedWorkflow.id,
          executionId,
          priority: workflow.priority || 5,
          timeout: workflow.timeout || this.config.workflowTimeout,
          metadata: workflow.metadata || {},
          startedAt: new Date(),
          updatedAt: new Date(),
          status: 'pending',
          assignedAgents: [],
          checkpointIds: [],
        };

        if (this.activeWorkflows.size >= this.config.maxConcurrentWorkflows) {
          this.workflowQueue.push(context);
          this.emit('workflow-queued', { executionId, workflowId: context.workflowId });
          return executionId;
        }

        await this.beginWorkflowExecution(context, validatedWorkflow);

        span.setStatus({ code: SpanStatusCode.OK });
        span.setAttributes({
          'workflow.id': context.workflowId,
          'workflow.execution_id': executionId,
          'workflow.priority': context.priority,
        });

        return executionId;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Get execution status
   */
  getExecutionStatus(executionId: string): WorkflowExecutionContext | undefined {
    return this.activeWorkflows.get(executionId);
  }

  /**
   * Cancel workflow execution
   */
  async cancelExecution(executionId: string): Promise<boolean> {
    const context = this.activeWorkflows.get(executionId);
    if (!context) return false;

    context.status = 'cancelled';
    context.updatedAt = new Date();
    this.activeWorkflows.delete(executionId);

    this.emit('workflow-cancelled', { executionId, workflowId: context.workflowId });
    return true;
  }

  /**
   * Get system health status
   */
  getSystemHealth(): SystemHealth {
    return { ...this.systemHealth };
  }

  /**
   * Get system metrics
   */
  getSystemMetrics() {
    const successfulExecutions = this.executionHistory.filter((h) => h.result === 'success').length;
    const totalExecutions = this.executionHistory.length;
    const averageExecutionTime =
      totalExecutions > 0
        ? this.executionHistory.reduce((sum, h) => sum + h.duration, 0) / totalExecutions
        : 0;

    return {
      activeWorkflows: this.activeWorkflows.size,
      queuedWorkflows: this.workflowQueue.length,
      totalExecutions,
      successRate: totalExecutions > 0 ? successfulExecutions / totalExecutions : 1.0,
      averageExecutionTime,
      componentHealth: this.systemHealth.components,
      uptime: Date.now(),
    };
  }

  /**
   * Begin workflow execution
   */
  private async beginWorkflowExecution(
    context: WorkflowExecutionContext,
    workflow: z.infer<typeof WorkflowSchema>,
  ): Promise<void> {
    const startTime = Date.now();
    context.status = 'running';
    context.updatedAt = new Date();
    this.activeWorkflows.set(context.executionId, context);

    try {
      // Create checkpoint if state persistence enabled
      if (this.config.statePersistenceEnabled && this.statePersistenceManager) {
        try {
          const checkpointId = await this.statePersistenceManager.createCheckpoint(
            'automatic',
            JSON.stringify({
              context,
              workflow,
              timestamp: new Date(),
            }),
          );
          context.checkpointIds.push(checkpointId);
        } catch {
          // Continue execution even if checkpoint fails
        }
      }

      // Execute workflow steps
      const result = await this.executeWorkflowSteps(context, workflow);

      // Update learning system
      if (this.config.learningSystemEnabled && this.learningSystemManager) {
        try {
          await this.learningSystemManager.learnFromExecution('master-agent-loop', {
            strategy: this.config.orchestrationMode,
            performance: {
              duration: Date.now() - context.startedAt.getTime(),
              stepsCompleted: Object.keys(result).length,
            },
            outcome: 'success',
            duration: Date.now() - context.startedAt.getTime(),
          });
        } catch {
          // Continue execution even if learning fails
        }
      }

      context.status = 'completed';
      context.updatedAt = new Date();

      this.recordExecutionHistory(context, 'success', Date.now() - startTime);
      this.emit('workflow-completed', {
        executionId: context.executionId,
        workflowId: context.workflowId,
        result,
      });
    } catch (error) {
      context.status = 'failed';
      context.updatedAt = new Date();

      this.recordExecutionHistory(context, 'failure', Date.now() - startTime);
      this.emit('workflow-failed', {
        executionId: context.executionId,
        workflowId: context.workflowId,
        error: (error as Error).message,
      });

      throw error;
    } finally {
      this.activeWorkflows.delete(context.executionId);
      this.processWorkflowQueue();
    }
  }

  /**
   * Execute workflow steps
   */
  private async executeWorkflowSteps(
    context: WorkflowExecutionContext,
    workflow: z.infer<typeof WorkflowSchema>,
  ): Promise<Record<string, unknown>> {
    const results: Record<string, unknown> = {};

    // Execute steps sequentially for simplicity
    for (const step of workflow.steps) {
      try {
        if (this.config.failureRecoveryEnabled && this.failureRecoveryManager) {
          results[step.id] = await this.failureRecoveryManager.executeWithRetry(
            async () => this.executeStep(step, context),
            {
              maxAttempts: 3,
              baseDelayMs: 1000,
              maxDelayMs: 10000,
              backoffMultiplier: 2,
              jitterEnabled: true,
              retryableErrors: ['timeout', 'network', 'transient'],
            },
          );
        } else {
          results[step.id] = await this.executeStep(step, context);
        }
      } catch (error) {
        // Simplified error handling - continue with other steps
        results[step.id] = { error: (error as Error).message };
      }
    }

    return results;
  }

  /**
   * Execute a single workflow step
   */
  private async executeStep(
    step: z.infer<typeof WorkflowSchema>['steps'][number],
    _context: WorkflowExecutionContext,
  ): Promise<unknown> {
    // Mock step execution
    await new Promise((resolve) => setTimeout(resolve, 100 + Math.random() * 400));

    return {
      stepId: step.id,
      status: 'completed',
      output: `Result of step ${step.id}`,
      executedAt: new Date(),
      executionTime: 100 + Math.random() * 400,
    };
  }

  /**
   * Record execution history
   */
  private recordExecutionHistory(
    context: WorkflowExecutionContext,
    result: 'success' | 'failure' | 'timeout',
    duration: number,
  ): void {
    this.executionHistory.push({
      context: { ...context },
      result,
      duration,
      timestamp: new Date(),
    });

    // Limit history size
    if (this.executionHistory.length > 1000) {
      this.executionHistory.splice(0, this.executionHistory.length - 1000);
    }
  }

  /**
   * Process queued workflows
   */
  private async processWorkflowQueue(): Promise<void> {
    // If shutting down, do not actually process items
    if (this.isShuttingDown) return;
    if (this.workflowQueue.length === 0) return;
    if (this.activeWorkflows.size >= this.config.maxConcurrentWorkflows) return;

    const nextContext = this.workflowQueue.shift();
    if (nextContext) {
      // Create a simple workflow from context
      const workflow = {
        id: nextContext.workflowId,
        name: `Queued Workflow ${nextContext.workflowId}`,
        steps: [
          {
            id: 'queued-step',
            name: 'Queued Step',
            type: 'action',
            action: { type: 'system', command: 'process' },
          },
        ],
        priority: nextContext.priority,
        timeout: nextContext.timeout,
        metadata: nextContext.metadata,
      };

      await this.beginWorkflowExecution(nextContext, workflow);
    }
  }

  /**
   * Start periodic coordination tasks
   */
  private startPeriodicTasks(): void {
    if (this.config.coordinationEnabled) {
      this.coordinationTimer = setInterval(() => {
        this.performPeriodicCoordination();
      }, this.config.coordinationInterval);
    }
  }

  /**
   * Perform periodic coordination
   */
  private async performPeriodicCoordination(): Promise<void> {
    try {
      await this.processWorkflowQueue();
      this.checkWorkflowTimeouts();
      this.updateSystemHealth();
    } catch (error) {
      this.emit('coordination-error', error);
    }
  }

  /**
   * Check for workflow timeouts
   */
  private checkWorkflowTimeouts(): void {
    const now = Date.now();
    const timedOutExecutions: string[] = [];

    for (const [executionId, context] of this.activeWorkflows) {
      if (context.timeout && now - context.startedAt.getTime() > context.timeout) {
        context.status = 'failed';
        context.updatedAt = new Date();
        timedOutExecutions.push(executionId);

        this.recordExecutionHistory(context, 'timeout', now - context.startedAt.getTime());
        this.emit('workflow-timeout', {
          executionId,
          workflowId: context.workflowId,
          duration: now - context.startedAt.getTime(),
        });
      }
    }

    for (const executionId of timedOutExecutions) {
      this.activeWorkflows.delete(executionId);
    }
  }

  /**
   * Update system health
   */
  private updateSystemHealth(): void {
    this.systemHealth.metrics.activeWorkflows = this.activeWorkflows.size;
    this.systemHealth.metrics.totalExecutions = this.executionHistory.length;

    const successful = this.executionHistory.filter((h) => h.result === 'success').length;
    this.systemHealth.metrics.successRate =
      this.executionHistory.length > 0 ? successful / this.executionHistory.length : 1.0;

    this.systemHealth.metrics.systemLoad =
      this.activeWorkflows.size / this.config.maxConcurrentWorkflows;
    this.systemHealth.lastHealthCheck = new Date();

    // Simple overall health calculation
    const componentValues = Object.values(this.systemHealth.components);
    if (componentValues.includes('critical')) {
      this.systemHealth.overall = 'critical';
    } else if (componentValues.includes('degraded')) {
      this.systemHealth.overall = 'degraded';
    } else if (componentValues.every((v) => v === 'offline')) {
      this.systemHealth.overall = 'offline';
    } else {
      this.systemHealth.overall = 'healthy';
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    this.isShuttingDown = true;

    if (this.coordinationTimer) {
      clearInterval(this.coordinationTimer);
      this.coordinationTimer = null;
    }

    // Cancel active workflows
    const activeExecutionIds = Array.from(this.activeWorkflows.keys());
    for (const executionId of activeExecutionIds) {
      await this.cancelExecution(executionId);
    }

    // Shutdown component managers if they exist
    await Promise.all(
      [
        this.agentPoolManager?.shutdown(),
        this.statePersistenceManager?.shutdown(),
        this.failureRecoveryManager?.shutdown(),
        this.learningSystemManager?.shutdown(),
      ].filter(Boolean),
    );

    this.emit('master-agent-loop-shutdown', {
      timestamp: new Date(),
      status: 'graceful',
    });

    this.removeAllListeners();
  }
}
