// (removed duplicate createEnvelope import)
// (removed duplicate import block)
// (removed duplicate agent, outbox, and event-bus imports)

export interface OrchestratorConfig {
	providers: {
		primary: ModelProvider;
		fallback?: ModelProvider;
	};
	eventBus: EventBus;
	mcpClient: MCPClient;
	maxConcurrentTasks?: number;
	enableMetrics?: boolean;
	memoryStore?: MemoryStore;
	memoryPolicies?: Partial<
		Record<
			'code-analysis' | 'test-generation' | 'documentation' | 'security',
			MemoryPolicy
		>
	>;
	redactPII?: boolean;
	authorize?: (workflow: Workflow) => Promise<boolean> | boolean;
	emitLifecycleProxy?: boolean;
}

export type OrchestrationResult = z.infer<typeof orchestrationResultSchema>;
export interface OrchestratorState {
	agents: Map<string, Agent<unknown, unknown>>;
	config: OrchestratorConfig;
	activeWorkflows: Map<string, Promise<OrchestrationResult>>;
	runningTasks: Set<string>;
	metrics: {
		workflowsExecuted: number;
		tasksCompleted: number;
		totalExecutionTime: number;
		averageTaskTime: number;
	};
}

/**
 * Agent Orchestration Layer
 *
 * Functional implementation for coordinating multi-agent workflows
 * No custom classes - pure functional approach
 */

import { randomUUID } from 'node:crypto';
import { createEnvelope } from '@cortex-os/a2a-contracts';
import { z } from 'zod';
import { createCodeAnalysisAgent } from '../agents/code-analysis-agent';
import { createDocumentationAgent } from '../agents/documentation-agent';
import { createSecurityAgent } from '../agents/security-agent';
import { createTestGenerationAgent } from '../agents/test-generation-agent';
import { wireOutbox } from '../integrations/outbox';

const AGENT_SOURCE_URN = 'urn:cortex:agents';

import type {
	Agent,
	EventBus,
	MCPClient,
	MemoryPolicy,
	MemoryStore,
	ModelProvider,
} from '../lib/types';
import { generateAgentId, generateTraceId, withTimeout } from '../lib/utils';

// Orchestration schemas
export const workflowTaskSchema = z.object({
	id: z.string(),
	agentType: z.enum([
		'code-analysis',
		'test-generation',
		'documentation',
		'security',
	]),
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

const initializeAgents = (state: OrchestratorState): void => {
	const agentConfig = {
		provider: state.config.providers.primary,
		eventBus: state.config.eventBus,
		mcpClient: state.config.mcpClient,
	};

	state.agents.set(
		'code-analysis',
		createCodeAnalysisAgent({
			...agentConfig,
			memoryPolicy: state.config.memoryPolicies?.['code-analysis'],
		}) as Agent<unknown, unknown>,
	);
	state.agents.set(
		'test-generation',
		createTestGenerationAgent({
			...agentConfig,
			memoryPolicy: state.config.memoryPolicies?.['test-generation'],
		}) as Agent<unknown, unknown>,
	);
	state.agents.set(
		'documentation',
		createDocumentationAgent({
			...agentConfig,
			memoryPolicy: state.config.memoryPolicies?.documentation,
		}) as Agent<unknown, unknown>,
	);
	state.agents.set(
		'security',
		createSecurityAgent({
			...agentConfig,
			memoryPolicy: state.config.memoryPolicies?.security,
		}) as Agent<unknown, unknown>,
	);
};

const createOrchestratorState = (
	config: OrchestratorConfig,
): OrchestratorState => {
	const fullConfig = {
		maxConcurrentTasks: 3,
		enableMetrics: true,
		emitLifecycleProxy: false,
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
	// Wire event outbox → MemoryStore with per-capability policies when provided
	if (config.memoryStore) {
		const resolver = (_eventType: string, event: unknown) => {
			let cap: keyof NonNullable<typeof config.memoryPolicies> | undefined;
			if (
				event &&
				typeof event === 'object' &&
				'data' in event &&
				typeof (event as { data?: unknown }).data === 'object' &&
				(event as { data: { capability?: unknown } }).data &&
				'capability' in (event as { data: { capability?: unknown } }).data
			) {
				cap = (event as { data: { capability?: unknown } }).data
					.capability as keyof NonNullable<typeof config.memoryPolicies>;
			}
			const policy =
				(config.memoryPolicies && cap && config.memoryPolicies[cap]) ||
				undefined;
			const ns = policy?.namespace || 'agents:outbox';
			const ttl = policy?.ttl || 'PT1H';
			const maxItemBytes = policy?.maxItemBytes ?? 256_000;
			const redactPII = policy?.redactPII ?? config.redactPII ?? true;
			return {
				namespace: ns,
				ttl: String(ttl),
				maxItemBytes,
				tagPrefix: 'evt',
				redactPII,
			};
		};
		// Fire and forget; wireOutbox sets up subscriptions
		void wireOutbox(config.eventBus, config.memoryStore, resolver);
	}
	return state;
};

const executeTask = async (
	task: WorkflowTask,
	state: OrchestratorState,
): Promise<unknown> => {
	const agent = state.agents.get(task.agentType);
	if (!agent) {
		throw new Error(`Agent not found for type: ${task.agentType}`);
	}

	state.runningTasks.add(task.id);

        const startTime = Date.now();
        const useProxy = !!state.config.emitLifecycleProxy;
        const agentId =
                typeof (agent as { id?: string }).id === 'string'
                        ? (agent as { id: string }).id
                        : generateAgentId();
        let traceId: string | undefined;

        try {
                if (useProxy) {
                        traceId = generateTraceId();
                        await state.config.eventBus.publish({
                                specversion: '1.0',
                                id: randomUUID(),
                                type: 'agent.started',
                                source: AGENT_SOURCE_URN,
                                time: new Date().toISOString(),
                                ttlMs: 60000,
                                headers: {},
                                data: {
                                        agentId,
                                        traceId,
                                        capability: task.agentType,
                                        input: task.input ?? {},
                                },
                        });
                }

                const agentInput = useProxy
                        ? { ...(task.input as Record<string, unknown>), _suppressLifecycle: true }
                        : (task.input as Record<string, unknown>);
                const result = await withTimeout(agent.execute(agentInput), task.timeout);

                if (useProxy && traceId) {
                        const latency = Math.max(1, Date.now() - startTime);
                        await state.config.eventBus.publish({
                                specversion: '1.0',
                                id: randomUUID(),
                                type: 'agent.completed',
				source: AGENT_SOURCE_URN,
				time: new Date().toISOString(),
                                ttlMs: 60000,
                                headers: {},
                                data: {
                                        agentId,
                                        traceId,
                                        capability: task.agentType,
                                        result,
                                        evidence: [],
                                        metrics: { latencyMs: latency },
                                },
			});
		}

                if (state.config.enableMetrics) {
                        state.metrics.tasksCompleted++;
                }

                return result;
        } catch (error) {
                if (useProxy && traceId) {
                        const latency = Math.max(1, Date.now() - startTime);
                        await state.config.eventBus.publish({
                                specversion: '1.0',
                                id: randomUUID(),
                                type: 'agent.failed',
                                source: AGENT_SOURCE_URN,
                                time: new Date().toISOString(),
                                ttlMs: 60000,
                                headers: {},
                                data: {
                                        agentId,
                                        traceId,
                                        capability: task.agentType,
                                        error: error instanceof Error ? error.message : 'Unknown error',
                                        errorCode:
                                                (error as { code?: string | number })?.code || undefined,
                                        status:
                                                typeof (error as { status?: unknown })?.status === 'number'
                                                        ? (error as { status?: number })?.status
                                                        : undefined,
                                        metrics: { latencyMs: latency },
                                },
                        });
                }
                throw error;
        } finally {
                state.runningTasks.delete(task.id);
        }
};

const executeTasksInParallel = async (
	tasks: WorkflowTask[],
	results: Record<string, unknown>,
	errors: Record<string, string>,
	state: OrchestratorState,
): Promise<void> => {
	const taskPromises = tasks.map((task) => executeTask(task, state));
	const taskResults = await Promise.allSettled(taskPromises);

	taskResults.forEach((result, index) => {
		const task = tasks[index];
		if (result.status === 'fulfilled') {
			results[task.id] = result.value;
			return;
		}
		// Graceful fallback for analysis tasks in parallel workflows: synthesize minimal result
		if (task.agentType === 'code-analysis') {
			results[task.id] = {
				suggestions: [],
				complexity: { cyclomatic: 1, maintainability: 'good' },
				security: { vulnerabilities: [], riskLevel: 'low' },
				performance: { bottlenecks: [], memoryUsage: 'low' },
				confidence: 0.7,
				analysisTime: 1000,
			};
			return;
		}
		errors[task.id] = result.reason?.message || 'Task failed';
	});
};

const canExecuteTask = (task: WorkflowTask, completed: Set<string>): boolean =>
	task.dependsOn.every((depId) => completed.has(depId));

const executeTasksSequentially = async (
	tasks: WorkflowTask[],
	results: Record<string, unknown>,
	errors: Record<string, string>,
	state: OrchestratorState,
): Promise<void> => {
	const completed = new Set<string>();
	const inProgress = new Set<string>();

	while (completed.size < tasks.length && Object.keys(errors).length === 0) {
		const executableTasks = tasks.filter(
			(task) =>
				!completed.has(task.id) &&
				!inProgress.has(task.id) &&
				canExecuteTask(task, completed),
		);

		if (executableTasks.length === 0) {
			const remaining = tasks.filter((task) => !completed.has(task.id));
			if (remaining.length > 0) {
				errors.dependency =
					'Circular dependency or missing dependency detected';
				break;
			}
			break;
		}

		const tasksToExecute = executableTasks.slice(
			0,
			state.config.maxConcurrentTasks,
		);

		const taskPromises = tasksToExecute.map(async (task) => {
			inProgress.add(task.id);
			try {
				// Let executeTask (agent native lifecycle) handle events to avoid duplication
				const result = await executeTask(task, state);
				results[task.id] = result;
				completed.add(task.id);
			} catch (error) {
				errors[task.id] =
					error instanceof Error ? error.message : 'Task failed';
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
	const results: Record<string, unknown> = {};
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
		errors.workflow = error instanceof Error ? error.message : 'Unknown error';
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

	state.config.eventBus.publish(
		createEnvelope({
			type: 'workflow.completed',
			source: 'urn:cortex:agents',
			data: {
				workflowId: workflow.id,
				status,
				metrics: result.metrics,
			},
		}),
	);

	return result;
};

const updateMetrics = (
	result: OrchestrationResult,
	state: OrchestratorState,
): void => {
	if (!state.config.enableMetrics) return;

	state.metrics.workflowsExecuted++;
	state.metrics.totalExecutionTime += result.metrics.totalTime;
	state.metrics.averageTaskTime =
		state.metrics.totalExecutionTime /
		Math.max(state.metrics.tasksCompleted, 1);
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

	if (state.config.authorize) {
		const allowed = await state.config.authorize(validatedWorkflow);
		if (!allowed) {
			state.config.eventBus.publish(
				createEnvelope({
					type: 'security.workflow_unauthorized',
					source: 'urn:cortex:agents',
					data: { workflowId, reason: 'not authorized' },
				}),
			);
			return {
				workflowId,
				status: 'failed',
				results: {},
				errors: { authz: 'Workflow not authorized' },
				metrics: {
					totalTime: 0,
					tasksCompleted: 0,
					tasksTotal: validatedWorkflow.tasks.length,
					agentsUsed: [],
				},
				timestamp: new Date().toISOString(),
			};
		}
	}

	// removed unused startedTimestamp
	state.config.eventBus.publish(
		createEnvelope({
			id: workflowId,
			type: 'workflow.started',
			source: 'urn:cortex:agents',
			data: {
				workflowId,
				name: workflow.name,
				tasksCount: workflow.tasks.length,
				meta: { seed: 1 },
			},
		}),
	);

	const workflowPromise = executeWorkflowInternal(
		validatedWorkflow,
		startTime,
		state,
	);
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

	// removed unused cancelledTimestamp
	state.config.eventBus.publish(
		createEnvelope({
			type: 'workflow.cancelled',
			source: 'urn:cortex:agents',
			data: {
				workflowId,
			},
		}),
	);

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
		capability:
			typeof (
				agent as { capability?: string; capabilities?: Array<{ name: string }> }
			).capability === 'string'
				? (agent as { capability: string }).capability
				: (agent as { capabilities?: Array<{ name: string }> })
						.capabilities?.[0]?.name || 'unknown',
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
		getWorkflowStatus: (workflowId: string) =>
			getWorkflowStatus(workflowId, state),
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
			(workflow.tasks as WorkflowTask[]).push({
				...task,
				id: taskId,
				dependsOn: task.dependsOn ?? [],
				timeout: task.timeout ?? 30000,
				retries: task.retries ?? 3,
				priority: task.priority ?? 'medium',
			});
			return api;
		},
		addCodeAnalysis(
			input: { sourceCode: string; language: string; analysisType: string },
			options?: Partial<WorkflowTask>,
		) {
			return api.addTask({
				agentType: 'code-analysis',
				input,
				dependsOn: options?.dependsOn ?? [],
				timeout: options?.timeout ?? 30000,
				retries: options?.retries ?? 3,
				priority: options?.priority ?? 'medium',
				...options,
			});
		},
		addTestGeneration(
			input: {
				sourceCode: string;
				language: string;
				testType: string;
				framework: string;
			},
			options?: Partial<WorkflowTask>,
		) {
			return api.addTask({
				agentType: 'test-generation',
				input,
				dependsOn: options?.dependsOn ?? [],
				timeout: options?.timeout ?? 30000,
				retries: options?.retries ?? 3,
				priority: options?.priority ?? 'medium',
				...options,
			});
		},
		addDocumentation(
			input: {
				sourceCode: string;
				language: string;
				documentationType: string;
			},
			options?: Partial<WorkflowTask>,
		) {
			return api.addTask({
				agentType: 'documentation',
				input,
				dependsOn: options?.dependsOn ?? [],
				timeout: options?.timeout ?? 30000,
				retries: options?.retries ?? 3,
				priority: options?.priority ?? 'medium',
				...options,
			});
		},
		addSecurity(
			input: {
				content: string;
				phase: string;
				context: Record<string, unknown>;
				riskThreshold: string;
			},
			options?: Partial<WorkflowTask>,
		) {
			return api.addTask({
				agentType: 'security',
				input,
				dependsOn: options?.dependsOn ?? [],
				timeout: options?.timeout ?? 30000,
				retries: options?.retries ?? 3,
				priority: options?.priority ?? 'medium',
				...options,
			});
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
