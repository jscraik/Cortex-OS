import { EventEmitter } from 'events';
import { z } from 'zod';

// Agent coordination schemas
export const AgentCoordinationRequestedSchema = z.object({
  id: z.string().uuid(),
  type: z.literal('agent.coordination.requested'),
  source: z.string(),
  subject: z.string(),
  time: z.string().datetime(),
  data: z.object({
    coordinationId: z.string().uuid(),
    workflowType: z.string(),
    participants: z.array(z.string()), // agent IDs
    payload: z.record(z.unknown()),
    deadline: z.string().datetime().optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
    metadata: z.record(z.unknown()).optional(),
  }),
});

export const AgentCoordinationProgressSchema = z.object({
  id: z.string().uuid(),
  type: z.literal('agent.coordination.progress'),
  source: z.string(),
  subject: z.string(),
  time: z.string().datetime(),
  data: z.object({
    coordinationId: z.string().uuid(),
    progress: z.number().min(0).max(100),
    currentStep: z.string(),
    message: z.string(),
    metadata: z.record(z.unknown()).optional(),
  }),
});

export const AgentCoordinationCompletedSchema = z.object({
  id: z.string().uuid(),
  type: z.literal('agent.coordination.completed'),
  source: z.string(),
  subject: z.string(),
  time: z.string().datetime(),
  data: z.object({
    coordinationId: z.string().uuid(),
    result: z.record(z.unknown()),
    executionTime: z.number(),
    participants: z.array(z.string()),
    metadata: z.record(z.unknown()).optional(),
  }),
});

export type AgentCoordinationRequested = z.infer<typeof AgentCoordinationRequestedSchema>;
export type AgentCoordinationProgress = z.infer<typeof AgentCoordinationProgressSchema>;
export type AgentCoordinationCompleted = z.infer<typeof AgentCoordinationCompletedSchema>;

// Workflow step definition
export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  agent: string; // agent ID that should handle this step
  taskType: string;
  payload: Record<string, unknown>;
  dependencies: string[]; // step IDs that must complete before this step
  timeout?: number;
}

// Workflow definition
export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  maxExecutionTime?: number;
}

// Workflow execution context
interface WorkflowExecution {
  id: string;
  definition: WorkflowDefinition;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  currentStep?: string;
  completedSteps: Set<string>;
  results: Map<string, Record<string, unknown>>;
  errors: Map<string, string>;
}

// Coordination handler interface
export interface CoordinationHandler {
  canHandle(workflowType: string): boolean;
  createWorkflow(payload: Record<string, unknown>): WorkflowDefinition;
  processResult(stepId: string, result: Record<string, unknown>): Record<string, unknown>;
}

// Example coordination handlers
export class DocumentProcessingWorkflow implements CoordinationHandler {
  canHandle(workflowType: string): boolean {
    return workflowType === 'document.process';
  }

  createWorkflow(payload: Record<string, unknown>): WorkflowDefinition {
    return {
      id: crypto.randomUUID(),
      name: 'Document Processing Workflow',
      description: 'Process a document through multiple analysis stages',
      steps: [
        {
          id: 'extract',
          name: 'Extract Content',
          description: 'Extract text and metadata from document',
          agent: 'agent-a',
          taskType: 'data.process',
          payload: { document: payload.document },
          dependencies: [],
          timeout: 30000,
        },
        {
          id: 'analyze',
          name: 'Analyze Content',
          description: 'Perform content analysis',
          agent: 'agent-a',
          taskType: 'data.analyze',
          payload: {}, // Will be populated with extract results
          dependencies: ['extract'],
          timeout: 60000,
        },
        {
          id: 'summarize',
          name: 'Generate Summary',
          description: 'Create executive summary',
          agent: 'agent-b',
          taskType: 'content.summarize',
          payload: {}, // Will be populated with analyze results
          dependencies: ['analyze'],
          timeout: 45000,
        },
      ],
      maxExecutionTime: 180000, // 3 minutes
    };
  }

  processResult(stepId: string, result: Record<string, unknown>): Record<string, unknown> {
    // Process and transform results based on step
    switch (stepId) {
      case 'extract':
        return {
          extractedContent: result.result,
          metadata: result.metadata,
        };
      case 'analyze':
        return {
          analysis: result.result,
          insights: result.insights,
        };
      case 'summarize':
        return {
          summary: result.result,
          keyPoints: result.keyPoints,
        };
      default:
        return result;
    }
  }
}

// Main Agent B class - Coordinator
export class AgentB extends EventEmitter {
  private handlers = new Map<string, CoordinationHandler>();
  private executions = new Map<string, WorkflowExecution>();

  constructor(private agentId: string = 'agent-b') {
    super();

    // Register default coordination handlers
    this.handlers.set('document.process', new DocumentProcessingWorkflow());
  }

  start(): void {
    this.emit('started', this.agentId);
  }

  stop(): void {
    this.emit('stopped', this.agentId);
  }

  registerCoordinationHandler(workflowType: string, handler: CoordinationHandler): void {
    this.handlers.set(workflowType, handler);
    this.emit('handlerRegistered', workflowType);
  }

  getSupportedWorkflowTypes(): string[] {
    return Array.from(this.handlers.keys());
  }

  async startCoordination(request: AgentCoordinationRequested): Promise<void> {
    const handler = this.handlers.get(request.data.workflowType);

    if (!handler) {
      throw new Error(`No handler found for workflow type: ${request.data.workflowType}`);
    }

    // Create workflow definition
    const workflow = handler.createWorkflow(request.data.payload);

    // Create execution context
    const execution: WorkflowExecution = {
      id: request.data.coordinationId,
      definition: workflow,
      status: 'pending',
      startTime: new Date(),
      completedSteps: new Set(),
      results: new Map(),
      errors: new Map(),
    };

    this.executions.set(execution.id, execution);

    // Start execution
    await this.executeWorkflow(execution);

    this.emit('coordinationStarted', execution.id);
  }

  private async executeWorkflow(execution: WorkflowExecution): Promise<void> {
    execution.status = 'running';
    this.emit('workflowStarted', execution.id);

    try {
      // Execute steps in topological order
      const steps = this.getExecutableSteps(execution);

      for (const step of steps) {
        await this.executeStep(execution, step);
      }

      // Mark as completed
      execution.status = 'completed';
      execution.endTime = new Date();

      // Emit completion event
      const completed: AgentCoordinationCompleted = {
        id: crypto.randomUUID(),
        type: 'agent.coordination.completed',
        source: this.agentId,
        subject: execution.definition.name,
        time: new Date().toISOString(),
        data: {
          coordinationId: execution.id,
          result: Object.fromEntries(execution.results),
          executionTime: execution.endTime.getTime() - execution.startTime.getTime(),
          participants: execution.definition.steps.map((s) => s.agent),
        },
      };

      this.emit('coordinationCompleted', completed);
    } catch (error) {
      execution.status = 'failed';
      execution.endTime = new Date();
      this.emit('coordinationFailed', execution.id, error);
    }
  }

  private getExecutableSteps(execution: WorkflowExecution): WorkflowStep[] {
    const executableSteps: WorkflowStep[] = [];

    for (const step of execution.definition.steps) {
      // Check if all dependencies are completed
      const dependenciesMet = step.dependencies.every((depId) =>
        execution.completedSteps.has(depId)
      );

      if (dependenciesMet && !execution.completedSteps.has(step.id)) {
        executableSteps.push(step);
      }
    }

    return executableSteps;
  }

  private async executeStep(execution: WorkflowExecution, step: WorkflowStep): Promise<void> {
    execution.currentStep = step.id;

    // Emit progress event
    const progress: AgentCoordinationProgress = {
      id: crypto.randomUUID(),
      type: 'agent.coordination.progress',
      source: this.agentId,
      subject: execution.definition.name,
      time: new Date().toISOString(),
      data: {
        coordinationId: execution.id,
        progress: (execution.completedSteps.size / execution.definition.steps.length) * 100,
        currentStep: step.name,
        message: `Executing step: ${step.name}`,
      },
    };

    this.emit('coordinationProgress', progress);

    try {
      // In a real implementation, this would send the task to the appropriate agent
      // For now, we'll simulate the execution
      const result = await this.simulateStepExecution(step);

      // Process the result
      const handler = this.handlers.get(
        execution.definition.name.toLowerCase().replace(/\s+/g, '.')
      );
      const processedResult = handler ? handler.processResult(step.id, result) : result;

      // Store the result
      execution.results.set(step.id, processedResult);
      execution.completedSteps.add(step.id);

      this.emit('stepCompleted', step.id, processedResult);
    } catch (error) {
      execution.errors.set(step.id, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  private async simulateStepExecution(step: WorkflowStep): Promise<Record<string, unknown>> {
    // Simulate execution time based on step
    const executionTime = step.timeout || 1000;
    await new Promise((resolve) => setTimeout(resolve, executionTime / 10)); // Faster for demo

    return {
      stepId: step.id,
      executed: true,
      result: `Result from ${step.name}`,
      timestamp: new Date().toISOString(),
    };
  }

  getExecutionStatus(coordinationId: string): WorkflowExecution | undefined {
    return this.executions.get(coordinationId);
  }

  // Utility method to create a coordination request
  createCoordinationRequest(
    workflowType: string,
    payload: Record<string, unknown>,
    participants: string[] = ['agent-a', 'agent-b'],
    priority: AgentCoordinationRequested['data']['priority'] = 'medium'
  ): AgentCoordinationRequested {
    return {
      id: crypto.randomUUID(),
      type: 'agent.coordination.requested',
      source: 'external',
      subject: `${this.agentId}:coordination`,
      time: new Date().toISOString(),
      data: {
        coordinationId: crypto.randomUUID(),
        workflowType,
        participants,
        payload,
        priority,
      },
    };
  }
}

// Factory function to create Agent B instance
export function createAgentB(agentId?: string): AgentB {
  return new AgentB(agentId);
}
