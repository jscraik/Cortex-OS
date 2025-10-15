/**
 * Coordination Tools for Cortex-OS MCP Integration
 * Implements multi-agent coordination with security controls and isolation
 * Maintains brAInwav branding and follows nO Master Agent Loop architecture
 */

import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import {
	type Agent,
	CoordinationRole,
	type CoordinationSession,
	CoordinationSessionManager,
	CoordinationStrategy,
	type CoordinationTask,
	type SecurityContext,
} from '../lib/coordination-session-manager.js';
import type { McpTool, ToolExecutionContext } from '../tools.js';
import { ToolExecutionError } from '../tools.js';

const sharedCoordinationSessionManager = new CoordinationSessionManager();

function normalizeSecurityContext(
        securityContext?: CreateCoordinationSessionInput['securityContext'],
): SecurityContext {
        const defaults: SecurityContext = {
                isolationLevel: 'moderate',
                permissions: {
                        canCreateAgents: false,
                        canManageWorkspace: false,
                        canAccessHistory: true,
                        canEmitEvents: true,
                },
                accessControls: {
                        allowedAgentIds: [],
                        restrictedResources: [],
                        maxConcurrentOperations: 5,
                },
        };

        if (!securityContext) {
                return defaults;
        }

        return {
                isolationLevel: securityContext.isolationLevel ?? defaults.isolationLevel,
                permissions: {
                        canCreateAgents:
                                securityContext.permissions?.canCreateAgents ??
                                defaults.permissions.canCreateAgents,
                        canManageWorkspace:
                                securityContext.permissions?.canManageWorkspace ??
                                defaults.permissions.canManageWorkspace,
                        canAccessHistory:
                                securityContext.permissions?.canAccessHistory ??
                                defaults.permissions.canAccessHistory,
                        canEmitEvents:
                                securityContext.permissions?.canEmitEvents ??
                                defaults.permissions.canEmitEvents,
                },
                accessControls: {
                        allowedAgentIds:
                                securityContext.accessControls?.allowedAgentIds ??
                                defaults.accessControls.allowedAgentIds,
                        restrictedResources:
                                securityContext.accessControls?.restrictedResources ??
                                defaults.accessControls.restrictedResources,
                        maxConcurrentOperations:
                                securityContext.accessControls?.maxConcurrentOperations ??
                                defaults.accessControls.maxConcurrentOperations,
                },
        };
}

const AgentSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	role: z.nativeEnum(CoordinationRole),
	status: z.enum(['available', 'busy', 'offline', 'error']),
	capabilities: z.array(z.string()),
	workspaceId: z.string().optional(),
	sessionId: z.string().optional(),
	metadata: z.object({
		createdBy: z.literal('brAInwav'),
		lastActive: z.date(),
		trustLevel: z.number().int().min(1).max(10),
	}),
});

const CoordinationTaskSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	description: z.string().min(1),
	assignedAgent: z.string().optional(),
	dependencies: z.array(z.string()),
	status: z.enum(['pending', 'in_progress', 'completed', 'failed', 'cancelled']),
	priority: z.number().int().min(1).max(10),
	estimatedDuration: z.number().int().positive(),
	metadata: z.record(z.unknown()),
});

const CreateCoordinationSessionInputSchema = z.object({
	name: z.string().min(1, 'coordination session name is required'),
	description: z.string().optional(),
	strategy: z.nativeEnum(CoordinationStrategy),
	workspaceId: z.string().optional(),
	sessionId: z.string().optional(),
	securityContext: z
		.object({
			isolationLevel: z.enum(['strict', 'moderate', 'relaxed']),
			permissions: z.object({
				canCreateAgents: z.boolean(),
				canManageWorkspace: z.boolean(),
				canAccessHistory: z.boolean(),
				canEmitEvents: z.boolean(),
			}),
			accessControls: z.object({
				allowedAgentIds: z.array(z.string()),
				restrictedResources: z.array(z.string()),
				maxConcurrentOperations: z.number().int().positive(),
			}),
		})
		.optional(),
	maxAgents: z.number().int().positive(),
	timeoutMs: z.number().int().positive(),
});

export type CreateCoordinationSessionInput = z.infer<typeof CreateCoordinationSessionInputSchema>;

export interface CoordinationSessionResult {
	session: CoordinationSession;
	coordinationId: string;
	timestamp: string;
	brainwavMetadata: {
		createdBy: 'brAInwav';
		securityEnabled: boolean;
		isolationActive: boolean;
	};
}

export class CreateCoordinationSessionTool
	implements McpTool<CreateCoordinationSessionInput, CoordinationSessionResult>
{
	readonly name = 'coordination-create-session';
	readonly description =
		'Creates a new multi-agent coordination session with security controls and isolation';
	readonly inputSchema = CreateCoordinationSessionInputSchema;

	constructor(
		private readonly manager: CoordinationSessionManager = sharedCoordinationSessionManager,
	) {}

	async execute(
		input: CreateCoordinationSessionInput,
		context?: ToolExecutionContext,
	): Promise<CoordinationSessionResult> {
		if (context?.signal?.aborted) {
			throw new ToolExecutionError('brAInwav Coordination: Tool execution aborted', {
				code: 'E_TOOL_ABORTED',
			});
		}

		try {
			if (!input.name || input.name.trim() === '') {
				throw new ToolExecutionError('brAInwav Coordination: Session name cannot be empty', {
					code: 'E_INVALID_INPUT',
				});
			}

			const coordinationId = `coord-${Date.now()}-${randomUUID().slice(0, 8)}`;

                        const securityContext = normalizeSecurityContext(input.securityContext);

			const session: CoordinationSession = {
				id: coordinationId,
				name: input.name,
				description: input.description,
				strategy: input.strategy || CoordinationStrategy.ADAPTIVE,
				agents: [],
				tasks: [],
				securityContext,
				metadata: {
					createdBy: 'brAInwav',
					createdAt: new Date(),
					updatedAt: new Date(),
					nOArchitecture: true,
					workspaceId: input.workspaceId,
					sessionId: input.sessionId,
				},
				status: 'active',
			};

			this.manager.saveSession(session);

			console.log(
				`brAInwav Coordination: Created secure coordination session ${coordinationId} with ${input.strategy} strategy`,
			);

			this.emitA2AEvent('coordination.session.created', {
				coordinationId,
				strategy: input.strategy,
				securityLevel: securityContext.isolationLevel,
				workspaceId: input.workspaceId,
				timestamp: new Date().toISOString(),
				brainwavOrigin: true,
			});

			return {
				session,
				coordinationId,
				timestamp: new Date().toISOString(),
				brainwavMetadata: {
					createdBy: 'brAInwav',
					securityEnabled: true,
					isolationActive: securityContext.isolationLevel === 'strict',
				},
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			throw new ToolExecutionError(`brAInwav Coordination: Failed to create session - ${message}`, {
				code: 'E_COORDINATION_SESSION_CREATE_FAILED',
				cause: error,
			});
		}
	}

	private emitA2AEvent(eventType: string, data: Record<string, unknown>): void {
		console.log(`brAInwav A2A: Emitting event ${eventType}`, data);
	}
}

const RegisterAgentInputSchema = z.object({
	coordinationId: z.string().min(1, 'coordination ID is required'),
	agent: AgentSchema.omit({ metadata: true }).extend({
		trustLevel: z.number().int().min(1).max(10),
	}),
	validatePermissions: z.boolean(),
});

export type RegisterAgentInput = z.infer<typeof RegisterAgentInputSchema>;

export interface RegisterAgentResult {
	coordinationId: string;
	agent: Agent;
	registered: boolean;
	securityValidated: boolean;
	timestamp: string;
	brainwavMetadata: {
		registeredBy: 'brAInwav';
		securityChecked: boolean;
	};
}

export class RegisterAgentTool implements McpTool<RegisterAgentInput, RegisterAgentResult> {
	readonly name = 'coordination-register-agent';
	readonly description = 'Registers an agent in a coordination session with security validation';
	readonly inputSchema = RegisterAgentInputSchema;

	constructor(
		private readonly manager: CoordinationSessionManager = sharedCoordinationSessionManager,
	) {}

	async execute(
		input: RegisterAgentInput,
		context?: ToolExecutionContext,
	): Promise<RegisterAgentResult> {
		if (context?.signal?.aborted) {
			throw new ToolExecutionError('brAInwav Coordination: Tool execution aborted', {
				code: 'E_TOOL_ABORTED',
			});
		}

		try {
			const session = this.manager.getSession(input.coordinationId);
			if (!session) {
				throw new ToolExecutionError(
					`brAInwav Coordination: Session ${input.coordinationId} not found`,
					{
						code: 'E_SESSION_NOT_FOUND',
					},
				);
			}

			if (input.validatePermissions !== false) {
				const isValid = await this.validateAgentSecurity(
					{ id: input.agent.id, trustLevel: input.agent.trustLevel },
					session.securityContext,
				);
				if (!isValid) {
					throw new ToolExecutionError('brAInwav Coordination: Agent failed security validation', {
						code: 'E_SECURITY_VALIDATION_FAILED',
					});
				}
			}

			const existingAgent = session.agents.find((a) => a.id === input.agent.id);
			if (existingAgent) {
				throw new ToolExecutionError(
					`brAInwav Coordination: Agent ${input.agent.id} already registered`,
					{
						code: 'E_AGENT_ALREADY_EXISTS',
					},
				);
			}

                        const { trustLevel, ...agentInput } = input.agent;
                        const baseAgent: Omit<Agent, 'metadata'> = {
                                id: agentInput.id,
                                name: agentInput.name,
                                role: agentInput.role,
                                status: agentInput.status,
                                capabilities: agentInput.capabilities,
                                workspaceId: agentInput.workspaceId,
                                sessionId: agentInput.sessionId,
                        };
                        const agent: Agent = {
                                ...baseAgent,
                                metadata: {
                                        createdBy: 'brAInwav',
                                        lastActive: new Date(),
                                        trustLevel: trustLevel ?? 5,
                                },
                        };

			const updatedSession = {
				...session,
				agents: [...session.agents, agent],
				metadata: {
					...session.metadata,
					updatedAt: new Date(),
				},
			};

			this.manager.saveSession(updatedSession);

			console.log(
				`brAInwav Coordination: Registered agent ${agent.id} in session ${input.coordinationId} with security validation`,
			);

			this.emitA2AEvent('coordination.agent.registered', {
				coordinationId: input.coordinationId,
				agentId: agent.id,
				role: agent.role,
				capabilities: agent.capabilities,
				securityValidated: input.validatePermissions,
				timestamp: new Date().toISOString(),
				brainwavOrigin: true,
			});

			return {
				coordinationId: input.coordinationId,
				agent,
				registered: true,
				securityValidated: input.validatePermissions !== false,
				timestamp: new Date().toISOString(),
				brainwavMetadata: {
					registeredBy: 'brAInwav',
					securityChecked: input.validatePermissions !== false,
				},
			};
		} catch (error) {
			if (error instanceof ToolExecutionError) throw error;
			const message = error instanceof Error ? error.message : String(error);
			throw new ToolExecutionError(
				`brAInwav Coordination: Agent registration failed - ${message}`,
				{
					code: 'E_AGENT_REGISTRATION_FAILED',
					cause: error,
				},
			);
		}
	}

	private async validateAgentSecurity(
		agent: { id?: string; trustLevel?: number },
		securityContext: SecurityContext,
	): Promise<boolean> {
		if (securityContext.isolationLevel === 'strict') {
			if (securityContext.accessControls.allowedAgentIds.length > 0) {
				if (!securityContext.accessControls.allowedAgentIds.includes(agent.id ?? '')) {
					return false;
				}
			}

			const trustLevel = typeof agent.trustLevel === 'number' ? agent.trustLevel : 5;
			if (trustLevel < 8) {
				return false;
			}
		}

		return true;
	}

	private emitA2AEvent(eventType: string, data: Record<string, unknown>): void {
		console.log(`brAInwav A2A: Emitting event ${eventType}`, data);
	}
}

const AssignTaskInputSchema = z.object({
	coordinationId: z.string().min(1, 'coordination ID is required'),
	task: CoordinationTaskSchema.omit({ id: true, status: true }).extend({
		id: z.string().optional(),
	}),
	agentId: z.string().optional(),
	strategy: z.enum(['auto', 'manual', 'capability_based']),
	validateSecurity: z.boolean(),
});

export type AssignTaskInput = z.infer<typeof AssignTaskInputSchema>;

export interface AssignTaskResult {
	coordinationId: string;
	task: CoordinationTask;
	assignedAgent?: Agent;
	strategy: string;
	securityValidated: boolean;
	timestamp: string;
	brainwavMetadata: {
		assignedBy: 'brAInwav';
		strategyUsed: string;
	};
}

const createCoordinationTask = (input: AssignTaskInput): CoordinationTask => {
	const taskId = input.task.id || `task-${Date.now()}-${randomUUID().slice(0, 8)}`;
	const coordinationTask: CoordinationTask = {
		id: taskId,
		name: input.task.name,
		description: input.task.description,
		assignedAgent: input.task.assignedAgent,
		dependencies: input.task.dependencies,
		status: 'pending',
		priority: input.task.priority,
		estimatedDuration: input.task.estimatedDuration,
		metadata: input.task.metadata ?? {},
	};
	return coordinationTask;
};

const selectAgentForTask = (
	agents: Agent[],
	strategy: string,
	task: CoordinationTask,
	agentId?: string,
): Agent | undefined => {
	if (agentId) {
		const agent = agents.find((a) => a.id === agentId);
		if (!agent) {
			throw new ToolExecutionError(`brAInwav Coordination: Agent ${agentId} not found in session`, {
				code: 'E_AGENT_NOT_FOUND',
			});
		}
		return agent;
	}

	if (strategy === 'capability_based') {
		return findBestAgentByCapabilities(agents, task);
	}

	return agents.find((agent) => agent.status === 'available');
};

const findBestAgentByCapabilities = (
	agents: Agent[],
	task: CoordinationTask,
): Agent | undefined => {
	let bestAgent: Agent | undefined;
	let bestScore = 0;

	for (const agent of agents) {
		if (agent.status !== 'available') continue;

		const rawCapabilities = task.metadata.requiredCapabilities;
		const requiredCapabilities = Array.isArray(rawCapabilities)
			? rawCapabilities.filter((cap): cap is string => typeof cap === 'string')
			: [];
		const matchCount = requiredCapabilities.filter((cap) =>
			agent.capabilities.includes(cap),
		).length;
		const score = requiredCapabilities.length > 0 ? matchCount / requiredCapabilities.length : 0;

		if (score > bestScore) {
			bestScore = score;
			bestAgent = agent;
		}
	}

	return bestAgent;
};

export class AssignTaskTool implements McpTool<AssignTaskInput, AssignTaskResult> {
	readonly name = 'coordination-assign-task';
	readonly description =
		'Assigns a task to an agent with security validation and strategy selection';
	readonly inputSchema = AssignTaskInputSchema;

	constructor(
		private readonly manager: CoordinationSessionManager = sharedCoordinationSessionManager,
	) {}

	async execute(input: AssignTaskInput, context?: ToolExecutionContext): Promise<AssignTaskResult> {
		if (context?.signal?.aborted) {
			throw new ToolExecutionError('brAInwav Coordination: Tool execution aborted', {
				code: 'E_TOOL_ABORTED',
			});
		}

		try {
			const session = this.manager.getSession(input.coordinationId);
			if (!session) {
				throw new ToolExecutionError(
					`brAInwav Coordination: Session ${input.coordinationId} not found`,
					{
						code: 'E_SESSION_NOT_FOUND',
					},
				);
			}

			const task = createCoordinationTask(input);
			const selectedAgent = selectAgentForTask(session.agents, input.strategy, task, input.agentId);

			let updatedAgent: Agent | undefined = selectedAgent;
			let updatedTask: CoordinationTask = task;
			if (selectedAgent) {
				const validated = await this.validateAndPrepareAssignment(
					task,
					selectedAgent,
					session.securityContext,
					input.validateSecurity !== false,
				);
				updatedAgent = validated.updatedAgent;
				updatedTask = validated.updatedTask;
			}

			const updatedAgents = selectedAgent
				? session.agents.map((a) => (a.id === selectedAgent.id ? (updatedAgent as Agent) : a))
				: session.agents;

			const updatedSession = {
				...session,
				tasks: [...session.tasks, updatedTask],
				agents: updatedAgents,
				metadata: {
					...session.metadata,
					updatedAt: new Date(),
				},
			};

			this.manager.saveSession(updatedSession);

			console.log(
				`brAInwav Coordination: Assigned task ${updatedTask.id} to agent ${updatedAgent?.id || 'unassigned'} using ${input.strategy} strategy`,
			);

			this.emitA2AEvent('coordination.task.assigned', {
				coordinationId: input.coordinationId,
				taskId: updatedTask.id,
				agentId: updatedAgent?.id,
				strategy: input.strategy,
				priority: input.task.priority,
				securityValidated: input.validateSecurity,
				timestamp: new Date().toISOString(),
				brainwavOrigin: true,
			});

			return {
				coordinationId: input.coordinationId,
				task: updatedTask,
				assignedAgent: updatedAgent,
				strategy: input.strategy,
				securityValidated: input.validateSecurity !== false,
				timestamp: new Date().toISOString(),
				brainwavMetadata: {
					assignedBy: 'brAInwav',
					strategyUsed: input.strategy,
				},
			};
		} catch (error) {
			if (error instanceof ToolExecutionError) throw error;
			const message = error instanceof Error ? error.message : String(error);
			throw new ToolExecutionError(`brAInwav Coordination: Task assignment failed - ${message}`, {
				code: 'E_TASK_ASSIGNMENT_FAILED',
				cause: error,
			});
		}
	}

	private async validateAndPrepareAssignment(
		task: CoordinationTask,
		agent: Agent,
		securityContext: SecurityContext,
		validateSecurity: boolean,
	): Promise<{ updatedAgent: Agent; updatedTask: CoordinationTask }> {
		const updatedTask: CoordinationTask = { ...task, assignedAgent: agent.id };

		if (validateSecurity) {
			const isValid = await this.validateTaskAssignment(updatedTask, agent, securityContext);
			if (!isValid) {
				throw new ToolExecutionError(
					'brAInwav Coordination: Task assignment failed security validation',
					{
						code: 'E_SECURITY_VALIDATION_FAILED',
					},
				);
			}
		}

		const updatedAgent: Agent = {
			...agent,
			status: 'busy',
			metadata: { ...agent.metadata, lastActive: new Date() },
		};

		return { updatedAgent, updatedTask };
	}

	private async validateTaskAssignment(
		_task: CoordinationTask,
		agent: Agent,
		securityContext: SecurityContext,
	): Promise<boolean> {
		if (securityContext.isolationLevel === 'strict') {
			if (securityContext.accessControls.allowedAgentIds.length > 0) {
				if (!securityContext.accessControls.allowedAgentIds.includes(agent.id)) {
					return false;
				}
			}

			if (agent.metadata.trustLevel < 8) {
				return false;
			}
		}

		return true;
	}

	private emitA2AEvent(eventType: string, data: Record<string, unknown>): void {
		console.log(`brAInwav A2A: Emitting event ${eventType}`, data);
	}
}

export const createCoordinationSessionTool = new CreateCoordinationSessionTool();
export const registerAgentTool = new RegisterAgentTool();
export const assignTaskTool = new AssignTaskTool();

export const coordinationTools = [
	createCoordinationSessionTool,
	registerAgentTool,
	assignTaskTool,
] as const;

export const coordinationSessionManager = sharedCoordinationSessionManager;

export type {
	Agent,
	CoordinationSession,
	CoordinationTask,
	SecurityContext,
} from '../lib/coordination-session-manager.js';
export {
	CoordinationRole,
	CoordinationStrategy,
} from '../lib/coordination-session-manager.js';
