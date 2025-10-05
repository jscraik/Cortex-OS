/**
 * RESTful Orchestration API Implementation
 * Provides comprehensive HTTP API for workflow orchestration
 */

import type { Context, MiddlewareHandler } from 'hono';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { jwt } from 'hono/jwt';
import { logger } from 'hono/logger';
import { timing } from 'hono/timing';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { CircuitBreakerManager } from '../lib/circuit-breaker.js';
import type { CompositeModelProvider } from '../providers/composite-provider.js';
import type { OrchestrationService } from '../types/orchestration-service.js';
import { AgentRole, OrchestrationStrategy, TaskStatus } from '../types.js';

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
const TaskViewSchema = z
	.object({
		id: z.string().min(1),
		title: z.string().min(1),
		status: z.nativeEnum(TaskStatus),
		workflowId: z.string().min(1),
		createdAt: z.union([z.string(), z.date()]),
		updatedAt: z.union([z.string(), z.date()]).optional(),
	})
	.passthrough();

const ListTasksResultSchema = z.object({
	tasks: z.array(TaskViewSchema),
	total: z.number().int().nonnegative(),
});

const WorkflowViewSchema = z
	.object({
		id: z.string().min(1),
		name: z.string().optional(),
		goal: z.string().optional(),
		status: z.string().optional(),
		strategy: z.nativeEnum(OrchestrationStrategy).optional(),
		createdAt: z.union([z.string(), z.date()]).optional(),
	})
	.passthrough();

const ListWorkflowsResultSchema = z.object({
	workflows: z.array(WorkflowViewSchema),
	total: z.number().int().nonnegative(),
});

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
const limiter = createRateLimiterMiddleware({
	windowMs: 60_000,
	limit: 100,
	keyGenerator: getClientIdentifier,
});

interface RateLimiterState {
	count: number;
	resetAt: number;
}

interface RateLimiterOptions {
	windowMs: number;
	limit: number;
	keyGenerator?: (context: Context) => string | undefined;
}

function getClientIdentifier(context: Context): string {
	return (
		context.req.header('cf-connecting-ip') ||
		context.req.header('x-forwarded-for') ||
		context.req.header('x-real-ip') ||
		context.req.header('x-client-ip') ||
		'anonymous'
	);
}

function createRateLimiterMiddleware(options: RateLimiterOptions): MiddlewareHandler {
	const { windowMs, limit, keyGenerator } = options;
	const requests = new Map<string, RateLimiterState>();

	return async (context, next) => {
		const clientKey = keyGenerator?.(context) ?? 'anonymous';
		const now = Date.now();
		const existing = requests.get(clientKey);
		if (!existing || existing.resetAt <= now) {
			requests.set(clientKey, { count: 1, resetAt: now + windowMs });
			await next();
			return;
		}

		if (existing.count >= limit) {
			const retryAfter = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
			context.res.headers.set('Retry-After', String(retryAfter));
			throw new HTTPException(429, {
				message: '[brAInwav] Orchestration API rate limit exceeded. Please retry later.',
			});
		}

		existing.count += 1;
		await next();
	};
}

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
			const workflow = WorkflowViewSchema.parse(await this.executeWorkflowCreation(c, request));
			return c.json(this.formatWorkflowResponse(workflow), 201);
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

			const result = ListWorkflowsResultSchema.parse(
				await this.orchestrationService.listWorkflows({
					page,
					limit,
					createdBy,
				}),
			);

			return c.json({
				workflows: result.workflows.map((workflow) => this.formatWorkflowResponse(workflow)),
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
				message: 'brAInwav: Failed to list workflows',
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
				await this.orchestrationService.cancelWorkflow(workflowId);
			});

			return c.json({
				status: 'cancelled',
				message: 'brAInwav: Workflow cancelled successfully',
			});
		} catch (error) {
			if (error instanceof Error && error.message.includes('not found')) {
				throw new HTTPException(404, {
					message: 'brAInwav: Workflow not found',
				});
			}
			console.error('brAInwav: cancel workflow failed', error);
			throw new HTTPException(500, {
				message: 'brAInwav: Failed to cancel workflow',
			});
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

			const rawResult = await this.orchestrationService.listTasks({
				workflowId,
				assignee,
				page,
				limit,
			});

			const resultTyped = ListTasksResultSchema.parse(rawResult);
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
			const taskView = TaskViewSchema.parse(task);

			return c.json(
				{
					id: taskView.id,
					title: taskView.title,
					status: taskView.status,
					workflowId: taskView.workflowId,
					createdAt: taskView.createdAt,
					links: {
						self: `/api/v1/tasks/${taskView.id}`,
						workflow: `/api/v1/workflows/${taskView.workflowId}`,
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
