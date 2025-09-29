/**
 * RESTful Orchestration API Implementation
 * Provides comprehensive HTTP API for workflow orchestration
 */

import type { Context } from 'hono';
import { Hono } from 'hono';
import { rateLimiter } from 'hono-rate-limiter';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { jwt } from 'hono/jwt';
import { logger } from 'hono/logger';
import { timing } from 'hono/timing';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { CircuitBreakerManager } from '../lib/circuit-breaker.js';
import type { CompositeModelProvider } from '../providers/composite-provider.js';
import { AgentRole, OrchestrationStrategy, TaskStatus } from '../types.js';
import type { OrchestrationService } from '../types/orchestration-service';

// JWT Secret - should be from environment
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Schemas
const CreateWorkflowSchema = z.object({
  name: z.string().min(1).max(180),
  goal: z.string().min(1).max(4096),
  description: z.string().max(2048).optional(),
  steps: z
    .array(
      z.object({
        name: z.string().min(1).max(160),
        description: z.string().min(1).max(1024),
        agent: z.string().min(1).max(160),
        estimatedDurationMs: z.number().int().positive().max(86_400_000).optional(),
      }),
    )
    .min(1)
    .max(50),
  agents: z
    .array(
      z.object({
        id: z.string().min(1).max(128),
        name: z.string().min(1).max(160),
        role: z.nativeEnum(AgentRole).optional(),
        capabilities: z.array(z.string().min(1).max(120)).max(64).optional(),
      }),
    )
    .min(1)
    .max(32),
  strategy: z.nativeEnum(OrchestrationStrategy).optional(),
  priority: z.number().int().min(1).max(10).optional(),
  context: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const UpdateWorkflowSchema = z.object({
  name: z.string().min(1).max(180).optional(),
  goal: z.string().min(1).max(4096).optional(),
  description: z.string().max(2048).optional(),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']).optional(),
  priority: z.number().int().min(1).max(10).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const CreateTaskSchema = z.object({
  title: z.string().min(1).max(160),
  description: z.string().max(2048).optional(),
  workflowId: z.string().min(1).max(128),
  assignee: z.string().min(1).max(160).optional(),
  capabilities: z.array(z.string().min(1).max(120)).max(32).optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  dependencies: z.array(z.string().min(1).max(128)).max(32).optional(),
  context: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const UpdateTaskSchema = z.object({
  title: z.string().min(1).max(160).optional(),
  description: z.string().max(2048).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  assignee: z.string().min(1).max(160).optional(),
  progress: z
    .object({
      current: z.number().int().min(0),
      total: z.number().int().positive(),
      message: z.string().max(512).optional(),
    })
    .optional(),
  metadata: z.record(z.unknown()).optional(),
});

const _AgentMetricsSchema = z.object({
  timeRange: z
    .object({
      start: z.string().datetime(),
      end: z.string().datetime(),
    })
    .optional(),
  granularity: z.enum(['minute', 'hour', 'day']).default('hour'),
});

type CreateWorkflowRequest = z.infer<typeof CreateWorkflowSchema>;
type UpdateWorkflowRequest = z.infer<typeof UpdateWorkflowSchema>;
type CreateTaskRequest = z.infer<typeof CreateTaskSchema>;
type UpdateTaskRequest = z.infer<typeof UpdateTaskSchema>;
type AgentMetricsRequest = z.infer<typeof _AgentMetricsSchema>;

// Local lightweight view types to type handler responses
type AgentView = {
  id: string;
  name: string;
  role?: string;
  status?: string;
  capabilities?: string[];
  lastSeen?: string | Date;
};

type WorkflowView = {
  id: string;
  name?: string;
  goal?: string;
  status?: string;
  strategy?: OrchestrationStrategy;
  createdAt?: string | Date;
};

// Rate limiter
const limiter = rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  limit: 100, // 100 requests per minute
  keyGenerator: (c: Context) => c.req.header('cf-connecting-ip') || 'anonymous',
});

// JWT middleware
const auth = jwt({
  secret: JWT_SECRET,
});

export class OrchestrationAPI {
  private readonly app: Hono;
  private readonly orchestrationService: OrchestrationService;
  private readonly compositeProvider: CompositeModelProvider;
  private readonly circuitBreakerManager: CircuitBreakerManager;

  constructor(
    orchestrationService: OrchestrationService,
    compositeProvider: CompositeModelProvider,
  ) {
    this.orchestrationService = orchestrationService;
    this.compositeProvider = compositeProvider;
    this.circuitBreakerManager = new CircuitBreakerManager();

    this.app = new Hono();

    // Global middleware
    this.app.use('*', timing());
    this.app.use('*', logger());
    this.app.use(
      '*',
      cors({
        origin: process.env.CORS_ORIGIN || '*',
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization'],
      }),
    );

    // Health check (no auth required)
    this.app.get('/health', this.healthCheck.bind(this));
    this.app.get('/metrics', this.prometheusMetrics.bind(this));

    // Public routes (no auth)
    this.app.get('/api/v1/agents', this.listAgents.bind(this));
    this.app.get('/api/v1/agents/:id/metrics', limiter, this.getAgentMetrics.bind(this));

    // Protected routes
    const protectedRoutes = new Hono();
    protectedRoutes.use('*', auth);

    // Workflow endpoints
    protectedRoutes.post('/api/v1/workflows', limiter, this.createWorkflow.bind(this));
    protectedRoutes.get('/api/v1/workflows', this.listWorkflows.bind(this));
    protectedRoutes.get('/api/v1/workflows/:id', this.getWorkflow.bind(this));
    protectedRoutes.put('/api/v1/workflows/:id', limiter, this.updateWorkflow.bind(this));
    protectedRoutes.delete('/api/v1/workflows/:id', limiter, this.cancelWorkflow.bind(this));

    // Task endpoints
    protectedRoutes.get('/api/v1/tasks', this.listTasks.bind(this));
    protectedRoutes.post('/api/v1/tasks', limiter, this.createTask.bind(this));
    protectedRoutes.get('/api/v1/tasks/:id', this.getTask.bind(this));
    protectedRoutes.patch('/api/v1/tasks/:id/status', limiter, this.updateTaskStatus.bind(this));
    protectedRoutes.put('/api/v1/tasks/:id', limiter, this.updateTask.bind(this));

    // Model endpoints
    protectedRoutes.post('/api/v1/models/embeddings', limiter, this.generateEmbeddings.bind(this));
    protectedRoutes.post('/api/v1/models/chat', limiter, this.generateChat.bind(this));
    protectedRoutes.post('/api/v1/models/rerank', limiter, this.rerank.bind(this));

    // Mount protected routes
    this.app.route('/', protectedRoutes);

    // Error handler
    this.app.onError(this.handleError.bind(this));
  }

  // Health check endpoint
  private async healthCheck(c: Context) {
    try {
      const [orchestrationHealth, providerHealth] = await Promise.all([
        this.circuitBreakerManager.execute('orchestration-health', async () => ({
          healthy: true,
          connections: await this.orchestrationService.getConnectionCount(),
        })),
        this.compositeProvider.healthCheck(),
      ]);

      return c.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0',
        services: {
          orchestration: orchestrationHealth,
          modelProviders: providerHealth,
        },
      });
    } catch (error) {
      console.error('brAInwav: health check failed', error);
      return c.json(
        {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        503,
      );
    }
  }

  // Prometheus metrics endpoint
  private async prometheusMetrics(c: Context) {
    try {
      const metrics = await this.orchestrationService.getMetrics();
      // metrics may be a structured object; return as JSON
      return c.json(metrics);
    } catch (error) {
      console.error('brAInwav: prometheus metrics fetch failed', error);
      throw new HTTPException(500, {
        message: 'Failed to fetch metrics',
      });
    }
  }

  // List agents
  private async listAgents(c: Context) {
    try {
      const agents = await this.orchestrationService.listAgents();
      return c.json({
        agents: (agents as unknown as AgentView[]).map((agent) => ({
          id: agent.id,
          name: agent.name,
          role: agent.role,
          status: agent.status,
          capabilities: agent.capabilities,
          lastSeen: agent.lastSeen,
        })),
        total: agents.length,
      });
    } catch (error) {
      console.error('brAInwav: list agents failed', error);
      throw new HTTPException(500, {
        message: 'Failed to list agents',
      });
    }
  }

  // Get agent metrics
  private async getAgentMetrics(c: Context) {
    try {
      const agentId = c.req.param('id');
      const query = c.req.query() as Record<string, string | undefined>;
      const request: AgentMetricsRequest = {
        timeRange:
          query.start && query.end
            ? {
              start: query.start,
              end: query.end,
            }
            : undefined,
        granularity: (query.granularity as 'minute' | 'hour' | 'day') ?? 'hour',
      };

      const metrics = await this.orchestrationService.getAgentMetrics(agentId, request);
      return c.json(metrics);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        throw new HTTPException(404, {
          message: 'Agent not found',
        });
      }
      throw new HTTPException(500, {
        message: 'Failed to fetch agent metrics',
      });
    }
  }

  // Create workflow
  private async createWorkflow(c: Context) {
    try {
      const request = await this.validateWorkflowRequest(c);
      const workflow = await this.executeWorkflowCreation(c, request);
      return c.json(this.formatWorkflowResponse(workflow as unknown as WorkflowView), 201);
    } catch (error) {
      this.handleWorkflowErrors(error);
    }
  }

  private async validateWorkflowRequest(c: Context): Promise<CreateWorkflowRequest> {
    const body = await c.req.json();
    return CreateWorkflowSchema.parse(body);
  }

  private async executeWorkflowCreation(c: Context, request: CreateWorkflowRequest) {
    return this.circuitBreakerManager.execute('create-workflow', async () => {
      const jwtPayload = c.get('jwtPayload') as unknown as { sub?: string } | undefined;
      return this.orchestrationService.createWorkflow({
        ...request,
        createdBy: jwtPayload?.sub ?? 'system',
        id: `workflow-${nanoid()}`,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });
  }

  private formatWorkflowResponse(workflow: WorkflowView) {
    return {
      id: workflow.id,
      name: workflow.name,
      goal: workflow.goal,
      status: workflow.status,
      strategy: workflow.strategy,
      createdAt: workflow.createdAt,
      links: {
        self: `/api/v1/workflows/${workflow.id}`,
        tasks: `/api/v1/workflows/${workflow.id}/tasks`,
      },
    };
  }

  private handleWorkflowErrors(error: unknown): never {
    if (error instanceof z.ZodError) {
      throw new HTTPException(400, {
        message: 'Invalid request body',
        cause: error.errors,
      });
    }
    throw error;
  }

  // List workflows
  private async listWorkflows(c: Context) {
    try {
      const query = c.req.query();
      const page = parseInt(query.page, 10) || 1;
      const limit = parseInt(query.limit, 10) || 20;
      // status filtering not implemented yet
      const createdBy = query.createdBy;

      const result = (await this.orchestrationService.listWorkflows({
        page,
        limit,
        createdBy,
      })) as unknown as { workflows: WorkflowView[]; total: number };

      return c.json({
        workflows: result.workflows,
        pagination: {
          page,
          limit,
          total: result.total,
          pages: Math.ceil(result.total / limit),
        },
      });
    } catch (error) {
      console.error('brAInwav: list workflows failed', error);
      throw new HTTPException(500, {
        message: 'Failed to list workflows',
      });
    }
  }

  // Get workflow
  private async getWorkflow(c: Context) {
    try {
      const workflowId = c.req.param('id');
      const workflow = await this.orchestrationService.getWorkflow(workflowId);

      if (!workflow) {
        throw new HTTPException(404, {
          message: 'Workflow not found',
        });
      }

      return c.json(workflow);
    } catch (error) {
      if (error instanceof HTTPException) throw error;
      throw new HTTPException(500, {
        message: 'Failed to fetch workflow',
      });
    }
  }

  // Update workflow
  private async updateWorkflow(c: Context) {
    try {
      const workflowId = c.req.param('id');
      const body = await c.req.json();
      const request: UpdateWorkflowRequest = UpdateWorkflowSchema.parse(body);

      const workflow = await this.circuitBreakerManager.execute('update-workflow', async () => {
        return this.orchestrationService.updateWorkflow(workflowId, {
          ...request,
          updatedAt: new Date(),
        });
      });

      return c.json(workflow);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new HTTPException(400, {
          message: 'Invalid request body',
          cause: error.errors,
        });
      }
      if (error instanceof Error && error.message.includes('not found')) {
        throw new HTTPException(404, {
          message: 'Workflow not found',
        });
      }
      throw error;
    }
  }

  // Cancel workflow
  private async cancelWorkflow(c: Context) {
    try {
      const workflowId = c.req.param('id');
      await this.circuitBreakerManager.execute('cancel-workflow', async () => {
        return this.orchestrationService.cancelWorkflow(workflowId);
      });

      return c.json({
        id: workflowId,
        status: 'cancelled',
        message: 'Workflow cancelled successfully',
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        throw new HTTPException(404, {
          message: 'Workflow not found',
        });
      }
      throw error;
    }
  }

  // List tasks
  private async listTasks(c: Context) {
    try {
      const query = c.req.query();
      const workflowId = query.workflowId;
      const assignee = query.assignee;
      const page = parseInt(query.page, 10) || 1;
      const limit = parseInt(query.limit, 10) || 20;

      const result = await this.orchestrationService.listTasks({
        workflowId,
        assignee,
        page,
        limit,
      });

      type ListTasksResult = { tasks: unknown[]; total: number };
      const resultTyped = result as unknown as ListTasksResult;
      return c.json({
        tasks: resultTyped.tasks,
        total: resultTyped.total,
        pages: Math.ceil((resultTyped.total || 0) / limit),
      });
    } catch (error) {
      console.error('brAInwav: list tasks failed', error);
      throw new HTTPException(500, {
        message: 'Failed to list tasks',
      });
    }
  }

  // Create task
  private async createTask(c: Context) {
    try {
      const body = await c.req.json();
      const request: CreateTaskRequest = CreateTaskSchema.parse(body);

      const task = await this.circuitBreakerManager.execute('create-task', async () => {
        return this.orchestrationService.createTask({
          ...request,
          id: `task-${nanoid()}`,
          status: TaskStatus.PENDING,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: c.get('jwtPayload').sub,
        });
      });

      return c.json(
        {
          id: task.id,
          title: task.title,
          status: task.status,
          workflowId: task.workflowId,
          createdAt: task.createdAt,
          links: {
            self: `/api/v1/tasks/${task.id}`,
            workflow: `/api/v1/workflows/${task.workflowId}`,
          },
        },
        201,
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new HTTPException(400, {
          message: 'Invalid request body',
          cause: error.errors,
        });
      }
      throw error;
    }
  }

  // Get task
  private async getTask(c: Context) {
    try {
      const taskId = c.req.param('id');
      const task = await this.orchestrationService.getTask(taskId);

      if (!task) {
        throw new HTTPException(404, {
          message: 'Task not found',
        });
      }

      return c.json(task);
    } catch (error) {
      if (error instanceof HTTPException) throw error;
      throw new HTTPException(500, {
        message: 'Failed to fetch task',
      });
    }
  }

  // Update task status
  private async updateTaskStatus(c: Context) {
    try {
      const taskId = c.req.param('id');
      const body = await c.req.json();

      if (!body.status || !Object.values(TaskStatus).includes(body.status)) {
        throw new HTTPException(400, {
          message: 'Invalid status',
        });
      }

      const task = await this.circuitBreakerManager.execute('update-task-status', async () => {
        return this.orchestrationService.updateTaskStatus(taskId, body.status, body.message);
      });

      return c.json(task);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        throw new HTTPException(404, {
          message: 'Task not found',
        });
      }
      throw error;
    }
  }

  // Update task
  private async updateTask(c: Context) {
    try {
      const taskId = c.req.param('id');
      const body = await c.req.json();
      const request: UpdateTaskRequest = UpdateTaskSchema.parse(body);

      const task = await this.circuitBreakerManager.execute('update-task', async () => {
        return this.orchestrationService.updateTask(taskId, {
          ...request,
          updatedAt: new Date(),
        });
      });

      return c.json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new HTTPException(400, {
          message: 'Invalid request body',
          cause: error.errors,
        });
      }
      if (error instanceof Error && error.message.includes('not found')) {
        throw new HTTPException(404, {
          message: 'Task not found',
        });
      }
      throw error;
    }
  }

  // Generate embeddings
  private async generateEmbeddings(c: Context) {
    try {
      const body = await c.req.json();

      if (!body.texts || !Array.isArray(body.texts) || body.texts.length === 0) {
        throw new HTTPException(400, {
          message: 'texts array is required',
        });
      }

      const result = await this.compositeProvider.generateEmbeddings({
        texts: body.texts,
        model: body.model,
        task: body.task,
      });

      return c.json(result);
    } catch (error) {
      console.error('brAInwav: embeddings generation failed', error);
      throw new HTTPException(500, {
        message: 'Failed to generate embeddings',
      });
    }
  }

  // Generate chat
  private async generateChat(c: Context) {
    try {
      const body = await c.req.json();

      if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
        throw new HTTPException(400, {
          message: 'messages array is required',
        });
      }

      const result = await this.compositeProvider.generateChat({
        messages: body.messages,
        model: body.model,
        task: body.task,
        maxTokens: body.maxTokens,
        temperature: body.temperature,
      });

      return c.json(result);
    } catch (error) {
      console.error('brAInwav: chat generation failed', error);
      throw new HTTPException(500, {
        message: 'Failed to generate chat response',
      });
    }
  }

  // Rerank documents
  private async rerank(c: Context) {
    try {
      const body = await c.req.json();

      if (!body.query || !body.documents || !Array.isArray(body.documents)) {
        throw new HTTPException(400, {
          message: 'query and documents array are required',
        });
      }

      const result = await this.compositeProvider.rerank({
        query: body.query,
        documents: body.documents,
        model: body.model,
      });

      return c.json(result);
    } catch (error) {
      console.error('brAInwav: rerank failed', error);
      throw new HTTPException(500, {
        message: 'Failed to rerank documents',
      });
    }
  }

  // Error handler
  private handleError(error: Error, c: Context) {
    console.error('API Error:', error);

    if (error instanceof HTTPException) {
      return c.json(
        {
          error: {
            code: error.status,
            message: error.message,
            details: error.cause,
          },
        },
        error.status,
      );
    }

    return c.json(
      {
        error: {
          code: 500,
          message: 'Internal Server Error',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
      },
      500,
    );
  }

  // Get Hono app instance
  getApp(): Hono {
    return this.app;
  }

  // Get fetch handler for deployment
  getFetchHandler(): (request: Request) => Promise<Response> {
    // Wrap Hono app.fetch so the type matches the expected signature
    return async (req: Request) => {
      // Ensure we always return a Promise<Response>
      return await this.app.fetch(req);
    };
  }
}

// Factory function
export function createOrchestrationAPI(
  orchestrationService: OrchestrationService,
  compositeProvider: CompositeModelProvider,
): OrchestrationAPI {
  return new OrchestrationAPI(orchestrationService, compositeProvider);
}
