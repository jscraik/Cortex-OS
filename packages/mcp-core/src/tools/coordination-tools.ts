/**
 * Coordination Tools for Cortex-OS MCP Integration
 * Implements multi-agent coordination with security controls and isolation
 * Maintains brAInwav branding and follows nO Master Agent Loop architecture
 */

import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { McpTool, ToolExecutionContext } from '../tools.js';
import { ToolExecutionError } from '../tools.js';

// ================================
// Coordination Types & Schemas
// ================================

export enum CoordinationRole {
	COORDINATOR = 'coordinator',
	EXECUTOR = 'executor',
	VALIDATOR = 'validator',
	OBSERVER = 'observer',
}

export enum CoordinationStrategy {
	SEQUENTIAL = 'sequential',
	PARALLEL = 'parallel',
	ADAPTIVE = 'adaptive',
	HIERARCHICAL = 'hierarchical',
}

export interface SecurityContext {
	isolationLevel: 'strict' | 'moderate' | 'relaxed';
	permissions: {
		canCreateAgents: boolean;
		canManageWorkspace: boolean;
		canAccessHistory: boolean;
		canEmitEvents: boolean;
	};
	accessControls: {
		allowedAgentIds: string[];
		restrictedResources: string[];
		maxConcurrentOperations: number;
	};
}

export interface Agent {
	id: string;
	name: string;
	role: CoordinationRole;
	status: 'available' | 'busy' | 'offline' | 'error';
	capabilities: string[];
	workspaceId?: string;
	sessionId?: string;
	metadata: {
		createdBy: 'brAInwav';
		lastActive: Date;
		trustLevel: number; // 1-10 scale
	};
}

export interface CoordinationTask {
	id: string;
	name: string;
	description: string;
	assignedAgent?: string;
	dependencies: string[];
	status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
	priority: number; // 1-10 scale
	estimatedDuration: number; // milliseconds
	metadata: Record<string, unknown>;
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

// ================================
// Create Coordination Session Tool
// ================================

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

export interface CoordinationSession {
	id: string;
	name: string;
	description?: string;
	strategy: CoordinationStrategy;
	agents: Agent[];
	tasks: CoordinationTask[];
	securityContext: SecurityContext;
	metadata: {
		createdBy: 'brAInwav';
		createdAt: Date;
		updatedAt: Date;
		nOArchitecture: boolean;
		workspaceId?: string;
		sessionId?: string;
	};
	status: 'active' | 'completed' | 'failed' | 'cancelled';
}

export interface CreateCoordinationSessionResult {
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
	implements McpTool<CreateCoordinationSessionInput, CreateCoordinationSessionResult>
{
	readonly name = 'coordination-create-session';
	readonly description =
		'Creates a new multi-agent coordination session with security controls and isolation';
	readonly inputSchema = CreateCoordinationSessionInputSchema;

	async execute(
		input: CreateCoordinationSessionInput,
		context?: ToolExecutionContext,
	): Promise<CreateCoordinationSessionResult> {
		if (context?.signal?.aborted) {
			throw new ToolExecutionError('brAInwav Coordination: Tool execution aborted', {
				code: 'E_TOOL_ABORTED',
			});
		}

		try {
			// brAInwav Validation: Ensure name is not empty
			if (!input.name || input.name.trim() === '') {
				throw new ToolExecutionError('brAInwav Coordination: Session name cannot be empty', {
					code: 'E_INVALID_INPUT',
				});
			}

			const coordinationId = `coord-${Date.now()}-${randomUUID().slice(0, 8)}`;

			// Create default security context if not provided
			const securityContext: SecurityContext = input.securityContext || {
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

			// Store session for cross-tool access
			CreateCoordinationSessionTool.coordinationSessions.set(coordinationId, session);

			console.log(
				`brAInwav Coordination: Created secure coordination session ${coordinationId} with ${input.strategy} strategy`,
			);

			// Emit A2A event for coordination session creation
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

	private static coordinationSessions = new Map<string, CoordinationSession>();

	static getCoordinationSession(coordinationId: string): CoordinationSession | undefined {
		return CreateCoordinationSessionTool.coordinationSessions.get(coordinationId);
	}

	static updateCoordinationSession(coordinationId: string, session: CoordinationSession): void {
		CreateCoordinationSessionTool.coordinationSessions.set(coordinationId, session);
	}

	private emitA2AEvent(eventType: string, data: Record<string, unknown>): void {
		// A2A event emission - would integrate with actual A2A message bus
		console.log(`brAInwav A2A: Emitting event ${eventType}`, data);
	}
}

// ================================
// Register Agent Tool
// ================================

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
			const session = CreateCoordinationSessionTool.getCoordinationSession(input.coordinationId);
			if (!session) {
				throw new ToolExecutionError(
					`brAInwav Coordination: Session ${input.coordinationId} not found`,
					{
						code: 'E_SESSION_NOT_FOUND',
					},
				);
			}

			// Security validation
			if (input.validatePermissions !== false) {
				const isValid = await this.validateAgentSecurity(input.agent, session.securityContext);
				if (!isValid) {
					throw new ToolExecutionError('brAInwav Coordination: Agent failed security validation', {
						code: 'E_SECURITY_VALIDATION_FAILED',
					});
				}
			}

			// Check if agent already exists
			const existingAgent = session.agents.find((a) => a.id === input.agent.id);
			if (existingAgent) {
				throw new ToolExecutionError(
					`brAInwav Coordination: Agent ${input.agent.id} already registered`,
					{
						code: 'E_AGENT_ALREADY_EXISTS',
					},
				);
			}

			// Create agent with brAInwav metadata
			const agent: Agent = {
				...input.agent,
				metadata: {
					createdBy: 'brAInwav',
					lastActive: new Date(),
					trustLevel: input.agent.trustLevel || 5,
				},
			};

			// Add agent to session
			session.agents.push(agent);
			session.metadata.updatedAt = new Date();
			CreateCoordinationSessionTool.updateCoordinationSession(input.coordinationId, session);

			console.log(
				`brAInwav Coordination: Registered agent ${agent.id} in session ${input.coordinationId} with security validation`,
			);

			// Emit A2A event for agent registration
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
		agent: Partial<Agent>,
		securityContext: SecurityContext,
	): Promise<boolean> {
		// brAInwav Security: Enhanced validation for strict isolation
		if (securityContext.isolationLevel === 'strict') {
			// Check allowed agent list first
			if (securityContext.accessControls.allowedAgentIds.length > 0) {
				if (!securityContext.accessControls.allowedAgentIds.includes(agent.id!)) {
					return false;
				}
			}

			// brAInwav Security: Trust level must be 8+ for strict mode
			const trustLevel = (agent as any).trustLevel || 5;
			if (trustLevel < 8) {
				return false;
			}
		}

		return true;
	}

	private emitA2AEvent(eventType: string, data: Record<string, unknown>): void {
		// A2A event emission - would integrate with actual A2A message bus
		console.log(`brAInwav A2A: Emitting event ${eventType}`, data);
	}
}

// ================================
// Assign Task Tool
// ================================

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

// brAInwav Utility: Extract task creation logic
const createCoordinationTask = (input: AssignTaskInput): CoordinationTask => {
	const taskId = input.task.id || `task-${Date.now()}-${randomUUID().slice(0, 8)}`;
	return {
		...input.task,
		id: taskId,
		status: 'pending',
		metadata: input.task.metadata || {},
	};
};

// brAInwav Utility: Extract agent assignment logic
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

// brAInwav Utility: Find agent by capabilities
const findBestAgentByCapabilities = (
	agents: Agent[],
	task: CoordinationTask,
): Agent | undefined => {
	let bestAgent: Agent | undefined;
	let bestScore = 0;

	for (const agent of agents) {
		if (agent.status !== 'available') continue;

		const requiredCapabilities = (task.metadata.requiredCapabilities as string[]) || [];
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

	async execute(input: AssignTaskInput, context?: ToolExecutionContext): Promise<AssignTaskResult> {
		if (context?.signal?.aborted) {
			throw new ToolExecutionError('brAInwav Coordination: Tool execution aborted', {
				code: 'E_TOOL_ABORTED',
			});
		}

		try {
			const session = CreateCoordinationSessionTool.getCoordinationSession(input.coordinationId);
			if (!session) {
				throw new ToolExecutionError(
					`brAInwav Coordination: Session ${input.coordinationId} not found`,
					{
						code: 'E_SESSION_NOT_FOUND',
					},
				);
			}

			const task = createCoordinationTask(input);
			const assignedAgent = selectAgentForTask(session.agents, input.strategy, task, input.agentId);

			if (assignedAgent) {
				await this.processAgentAssignment(
					task,
					assignedAgent,
					session.securityContext,
					input.validateSecurity !== false,
				);
			}

			// Update session
			session.tasks.push(task);
			session.metadata.updatedAt = new Date();
			CreateCoordinationSessionTool.updateCoordinationSession(input.coordinationId, session);

			console.log(
				`brAInwav Coordination: Assigned task ${task.id} to agent ${assignedAgent?.id || 'unassigned'} using ${input.strategy} strategy`,
			);

			// Emit A2A event for task assignment
			this.emitA2AEvent('coordination.task.assigned', {
				coordinationId: input.coordinationId,
				taskId: task.id,
				agentId: assignedAgent?.id,
				strategy: input.strategy,
				priority: input.task.priority,
				securityValidated: input.validateSecurity,
				timestamp: new Date().toISOString(),
				brainwavOrigin: true,
			});

			return {
				coordinationId: input.coordinationId,
				task,
				assignedAgent,
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

	private async processAgentAssignment(
		task: CoordinationTask,
		assignedAgent: Agent,
		securityContext: SecurityContext,
		validateSecurity: boolean,
	): Promise<void> {
		task.assignedAgent = assignedAgent.id;

		if (validateSecurity) {
			const isValid = await this.validateTaskAssignment(task, assignedAgent, securityContext);
			if (!isValid) {
				throw new ToolExecutionError(
					'brAInwav Coordination: Task assignment failed security validation',
					{
						code: 'E_SECURITY_VALIDATION_FAILED',
					},
				);
			}
		}

		assignedAgent.status = 'busy';
		assignedAgent.metadata.lastActive = new Date();
	}

	private async validateTaskAssignment(
		_task: CoordinationTask,
		agent: Agent,
		securityContext: SecurityContext,
	): Promise<boolean> {
		// brAInwav Security: Enhanced task assignment validation
		if (securityContext.isolationLevel === 'strict') {
			// Check if agent is in allowed list
			if (securityContext.accessControls.allowedAgentIds.length > 0) {
				if (!securityContext.accessControls.allowedAgentIds.includes(agent.id)) {
					return false;
				}
			}

			// brAInwav Security: Trust level must be 8+ for strict mode
			if (agent.metadata.trustLevel < 8) {
				return false;
			}
		}

		return true;
	}

	private emitA2AEvent(eventType: string, data: Record<string, unknown>): void {
		// A2A event emission - would integrate with actual A2A message bus
		console.log(`brAInwav A2A: Emitting event ${eventType}`, data);
	}
}

// ================================
// Tool Instances & Exports
// ================================

export const createCoordinationSessionTool = new CreateCoordinationSessionTool();
export const registerAgentTool = new RegisterAgentTool();
export const assignTaskTool = new AssignTaskTool();

// Export all coordination tools
export const coordinationTools = [
	createCoordinationSessionTool,
	registerAgentTool,
	assignTaskTool,
] as const;
