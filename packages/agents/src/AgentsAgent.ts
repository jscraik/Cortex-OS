/**
 * @file Agents Package A2A Agent Implementation
 * @description Exposes agent coordination capabilities via A2A for cross-package communication
 * @author brAInwav Cortex-OS Team
 * @version 1.0.0
 * @status TDD-DRIVEN
 */

import { randomUUID } from 'node:crypto';
import type {
	A2AMessage,
	AgentCapabilities,
	AgentCard,
	AgentSkill,
} from '@cortex-os/a2a-contracts';
import { z } from 'zod';
import type { AgentListResponse, AgentStatus, SystemStatus, TaskDelegation } from './types.js';

// Define TransportProtocol enum locally
enum TransportProtocol {
	HTTP = 'http',
	WEBSOCKET = 'websocket',
}

/**
 * AgentsAgent - Exposes agent coordination capabilities as A2A skills
 * Implements master-agent coordination and sub-agent management
 */
export class AgentsAgent {
	private agentId: string;
	private agentCard: AgentCard;

	constructor(agentId = 'cortex-agents') {
		this.agentId = agentId;
		this.agentCard = this.buildAgentCard();
	}

	/**
	 * Build the agent card for A2A discovery
	 */
	private buildAgentCard(): AgentCard {
		const skills: AgentSkill[] = [
			{
				name: 'agent_coordinate',
				description: 'Coordinate task execution across specialized sub-agents',
				parameters: {
					task: 'string',
					context: 'string?',
					priority: 'low|medium|high|critical',
				},
				returns: 'AgentCoordinationResult',
			},
			{
				name: 'agent_create_subagent',
				description: 'Create and configure a new specialized sub-agent',
				parameters: {
					name: 'string',
					specialization: 'code-analysis|test-generation|documentation|security',
					capabilities: 'string[]',
					model: 'string?',
				},
				returns: 'SubagentConfig',
			},
			{
				name: 'agent_list_agents',
				description: 'List all available agents and their capabilities',
				parameters: {},
				returns: 'AgentInfo[]',
			},
			{
				name: 'agent_get_status',
				description: 'Get current status of agent system and active tasks',
				parameters: {
					agentId: 'string?',
				},
				returns: 'AgentStatus',
			},
			{
				name: 'agent_delegate_task',
				description: 'Delegate specific task to appropriate sub-agent',
				parameters: {
					task: 'string',
					targetAgent: 'string',
					urgency: 'low|medium|high',
				},
				returns: 'DelegationResult',
			},
		];

		const capabilities: AgentCapabilities = {
			skills,
			supportedProtocols: [TransportProtocol.HTTP, TransportProtocol.WEBSOCKET],
			maxConcurrentTasks: 10,
			resourceLimits: {
				memoryMB: 2048,
				cpuPercent: 75,
				timeoutMs: 120000,
			},
			streaming: true,
			pushNotifications: true,
			stateTransitionHistory: true,
			extensions: [
				{
					uri: 'https://cortex-os.ai/extensions/langgraphjs-coordination',
					description: 'LangGraphJS-based master-agent coordination',
					required: true,
				},
				{
					uri: 'https://cortex-os.ai/extensions/mcp-integration',
					description: 'Model Context Protocol tool integration',
					required: false,
				},
			],
		};

		return {
			agent: {
				name: 'brAInwav Agents Coordinator',
				version: '1.0.0',
				description:
					'Master agent coordinator managing specialized sub-agents for code analysis, testing, documentation, and security',
				provider: {
					organization: 'brAInwav',
					url: 'https://brainwav.ai',
				},
				capabilities,
				license: 'Apache-2.0 OR Commercial',
				documentation: 'https://docs.cortex-os.ai/packages/agents',
				tags: ['coordination', 'master-agent', 'langgraphjs', 'mcp', 'delegation'],
			},
			interface: {
				transport: TransportProtocol.HTTP,
				uri: 'http://127.0.0.1:3001/a2a',
			},
			skills,
		};
	}

	/**
	 * Get the agent card for A2A discovery
	 */
	getAgentCard(): AgentCard {
		return this.agentCard;
	}

	/**
	 * Handle A2A message and route to appropriate skill
	 */
	async handleMessage(message: A2AMessage): Promise<A2AMessage> {
		const { action, params } = message;

		try {
			let result: unknown;

			switch (action) {
				case 'agent_coordinate':
					result = await this.coordinateTask(params || {});
					break;
				case 'agent_create_subagent':
					result = await this.createSubagent(params || {});
					break;
				case 'agent_list_agents':
					result = await this.listAgents();
					break;
				case 'agent_get_status':
					result = await this.getStatus(params || {});
					break;
				case 'agent_delegate_task':
					result = await this.delegateTask(params || {});
					break;
				default:
					throw new Error(`Unknown action: ${action}`);
			}

			return {
				id: randomUUID(),
				from: this.agentId,
				to: message.from,
				type: 'response',
				protocol: message.protocol,
				payload: result,
				timestamp: new Date(),
				correlationId: message.correlationId,
			};
		} catch (error) {
			return {
				id: randomUUID(),
				from: this.agentId,
				to: message.from,
				type: 'error',
				protocol: message.protocol,
				payload: {
					error: {
						code: 'SKILL_EXECUTION_ERROR',
						message: error instanceof Error ? error.message : String(error),
					},
				},
				timestamp: new Date(),
				correlationId: message.correlationId,
			};
		}
	}

	/**
	 * Coordinate task execution across specialized sub-agents
	 */
	private async coordinateTask(params: Record<string, unknown>) {
		const taskSchema = z.object({
			task: z.string(),
			context: z.string().optional(),
			priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
		});

		const { task, priority } = taskSchema.parse(params);

		// Simulate coordination logic (would integrate with actual MasterAgent)
		return {
			coordinationId: randomUUID(),
			task,
			assignedAgent: 'code-analysis-agent', // Would use actual routing logic
			priority,
			estimatedDuration: 30000,
			status: 'started',
			timestamp: new Date().toISOString(),
		};
	}

	/**
	 * Create and configure a new specialized sub-agent
	 */
	private async createSubagent(params: Record<string, unknown>) {
		const subagentSchema = z.object({
			name: z.string(),
			specialization: z.enum(['code-analysis', 'test-generation', 'documentation', 'security']),
			capabilities: z.array(z.string()),
			model: z.string().optional().default('glm-4.5-mlx'),
		});

		const config = subagentSchema.parse(params);

		return {
			agentId: randomUUID(),
			...config,
			status: 'created',
			createdAt: new Date().toISOString(),
		};
	}

	/**
	 * List all available agents and their capabilities
	 */
	private async listAgents(): Promise<AgentListResponse> {
		return {
			agents: [
				{
					id: 'code-analysis-agent',
					name: 'Code Analysis Agent',
					specialization: 'code-analysis',
					capabilities: ['analyze', 'review', 'code', 'quality'],
					status: 'online',
					model: 'glm-4.5-mlx',
				},
				{
					id: 'test-generation-agent',
					name: 'Test Generation Agent',
					specialization: 'test-generation',
					capabilities: ['test', 'spec', 'unit', 'integration'],
					status: 'online',
					model: 'glm-4.5-mlx',
				},
				{
					id: 'documentation-agent',
					name: 'Documentation Agent',
					specialization: 'documentation',
					capabilities: ['document', 'readme', 'docs', 'markdown'],
					status: 'online',
					model: 'glm-4.5-mlx',
				},
				{
					id: 'security-agent',
					name: 'Security Agent',
					specialization: 'security',
					capabilities: ['security', 'vulnerability', 'audit', 'scan'],
					status: 'online',
					model: 'glm-4.5-mlx',
				},
			],
			totalAgents: 4,
			onlineAgents: 4,
			timestamp: new Date().toISOString(),
		};
	}

	/**
	 * Get current status of agent system and active tasks
	 */
	private async getStatus(params: Record<string, unknown>): Promise<AgentStatus | SystemStatus> {
		const statusSchema = z.object({
			agentId: z.string().optional(),
		});

		const { agentId } = statusSchema.parse(params);

		if (agentId) {
			// Return specific agent status
			return {
				agentId,
				status: 'online',
				activeTasks: 0,
				completedTasks: 5,
				averageResponseTime: 250,
				lastActivity: new Date().toISOString(),
			};
		}

		// Return system status
		return {
			systemStatus: 'healthy',
			totalAgents: 4,
			onlineAgents: 4,
			activeTasks: 0,
			completedTasks: 20,
			averageResponseTime: 245,
			systemUptime: 3600000,
			timestamp: new Date().toISOString(),
		};
	}

	/**
	 * Delegate specific task to appropriate sub-agent
	 */
	private async delegateTask(params: Record<string, unknown>): Promise<TaskDelegation> {
		const delegationSchema = z.object({
			task: z.string(),
			targetAgent: z.string(),
			urgency: z.enum(['low', 'medium', 'high']).default('medium'),
		});

		const { task, targetAgent, urgency } = delegationSchema.parse(params);

		return {
			delegationId: randomUUID(),
			task,
			targetAgent,
			urgency,
			status: 'delegated',
			estimatedCompletion: new Date(Date.now() + 60000).toISOString(),
			timestamp: new Date().toISOString(),
		};
	}

	/**
	 * Get agent status for A2A coordination
	 */
	getAgentStatus(): {
		agent_id: string;
		status: 'idle' | 'busy' | 'offline' | 'error';
		capabilities_healthy: boolean;
		skills_available: number;
	} {
		return {
			agent_id: this.agentId,
			status: 'idle',
			capabilities_healthy: true,
			skills_available: this.agentCard.skills.length,
		};
	}
}

/**
 * Create and export singleton agents agent instance
 */
export const agentsAgent = new AgentsAgent('cortex-agents');

/**
 * Export factory function for custom configurations
 */
export function createAgentsAgent(agentId?: string): AgentsAgent {
	return new AgentsAgent(agentId);
}

/**
 * Agents A2A Skills Registry
 */
export const AGENTS_A2A_SKILLS = {
	AGENT_COORDINATE: 'agent_coordinate',
	AGENT_CREATE_SUBAGENT: 'agent_create_subagent',
	AGENT_LIST_AGENTS: 'agent_list_agents',
	AGENT_GET_STATUS: 'agent_get_status',
	AGENT_DELEGATE_TASK: 'agent_delegate_task',
} as const;
