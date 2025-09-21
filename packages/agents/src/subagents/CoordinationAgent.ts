/**
 * Coordination Agent
 *
 * Specialized sub-agent for cross-agent coordination and workflow management
 * following the LangGraphJS framework pattern.
 *
 * Co-authored-by: brAInwav Development Team
 */

import { EventEmitter } from 'node:events';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import type { RunnableConfig } from '@langchain/core/runnables';
import { Annotation, END, MessagesAnnotation, START, StateGraph } from '@langchain/langgraph';

// Type aliases to replace union types
export type AgentStatus = 'idle' | 'busy' | 'error' | 'complete';
export type MessageType = 'request' | 'response' | 'notification';
export type CommunicationProtocol = 'a2a' | 'mcp' | 'direct';

// Coordination State
export const CoordinationStateAnnotation = Annotation.Root({
	...MessagesAnnotation.spec,
	currentStep: Annotation<string>,
	coordinationPlan: Annotation<
		| {
				workflow: string;
				participants: string[];
				dependencies: Record<string, string[]>;
				timeline: Array<{ agent: string; action: string; order: number }>;
		  }
		| undefined
	>(),
	agentStatuses:
		Annotation<
			Record<
				string,
				{
					status: AgentStatus;
					lastUpdate: string;
					currentTask?: string;
				}
			>
		>(),
	communicationLog:
		Annotation<
			Array<{
				from: string;
				to: string;
				message: string;
				timestamp: string;
				type: MessageType;
			}>
		>(),
	context: Annotation<Record<string, unknown>>(),
	result: Annotation<unknown>(),
	error: Annotation<string | undefined>(),
});

export type CoordinationState = typeof CoordinationStateAnnotation.State;

// Configuration for Coordination Agent
export interface CoordinationConfig {
	name: string;
	maxCoordinatedAgents: number;
	coordinationTimeout: number;
	enableWorkflowManagement: boolean;
	communicationProtocol: 'a2a' | 'mcp' | 'direct';
}

/**
 * Coordination Agent - Handles cross-agent coordination and workflow management
 */
export class CoordinationAgent extends EventEmitter {
	private readonly graph: ReturnType<typeof createCoordinationGraph>;
	private readonly registeredAgents: Map<string, { capabilities: string[]; status: string }>;
	private readonly config: CoordinationConfig;

	constructor(config: CoordinationConfig) {
		super();
		this.config = config;
		this.registeredAgents = new Map();
		this.initializeAgentRegistry();
		this.graph = createCoordinationGraph();
		// Light usage to avoid unused warning and provide observability
		console.log(
			`CoordinationAgent initialized with max agents: ${this.config.maxCoordinatedAgents}`,
		);
		// Use config to set up coordination parameters
		console.log(
			`CoordinationAgent initialized with max agents: ${this.config.maxCoordinatedAgents}`,
		);
	}

	/**
	 * Execute coordination operations
	 */
	async execute(
		input: string,
		options?: {
			context?: Record<string, unknown>;
			config?: RunnableConfig;
		},
	): Promise<CoordinationState> {
		const initialState: CoordinationState = {
			messages: [new HumanMessage({ content: input })],
			currentStep: 'workflow_analysis',
			coordinationPlan: undefined,
			agentStatuses: {},
			communicationLog: [],
			context: options?.context || {},
			result: undefined,
			error: undefined,
		};

		try {
			return await this.graph.invoke(initialState, options?.config);
		} catch (error) {
			this.emit('error', error);
			throw error;
		}
	}

	/**
	 * Initialize agent registry with known agents
	 */
	private initializeAgentRegistry(): void {
		this.registeredAgents.set('intelligence-scheduler-agent', {
			capabilities: ['analysis', 'planning', 'scheduling'],
			status: 'idle',
		});

		this.registeredAgents.set('tool-layer-agent', {
			capabilities: ['tool-execution', 'dashboard', 'monitoring'],
			status: 'idle',
		});

		this.registeredAgents.set('execution-surface-agent', {
			capabilities: ['deployment', 'networking', 'file-system'],
			status: 'idle',
		});
	}

	/**
	 * Register a new agent for coordination
	 */
	registerAgent(name: string, capabilities: string[]): void {
		this.registeredAgents.set(name, {
			capabilities,
			status: 'idle',
		});
		this.emit('agent-registered', { name, capabilities });
	}

	/**
	 * Unregister an agent
	 */
	unregisterAgent(name: string): void {
		this.registeredAgents.delete(name);
		this.emit('agent-unregistered', { name });
	}

	/**
	 * Get agent capabilities
	 */
	getCapabilities(): string[] {
		return ['coordination', 'workflow', 'communication', 'synchronization'];
	}

	/**
	 * Get registered agents
	 */
	getRegisteredAgents(): Array<{ name: string; capabilities: string[]; status: string }> {
		return Array.from(this.registeredAgents.entries()).map(([name, info]) => ({
			name,
			capabilities: info.capabilities,
			status: info.status,
		}));
	}

	/**
	 * Health check
	 */
	async healthCheck(): Promise<{
		status: string;
		timestamp: string;
		registeredAgents: number;
		activeWorkflows: number;
	}> {
		return {
			status: 'healthy',
			timestamp: new Date().toISOString(),
			registeredAgents: this.registeredAgents.size,
			activeWorkflows: 0, // In production, track active workflows
		};
	}
}

/**
 * Create LangGraphJS workflow for Coordination Agent
 */
function createCoordinationGraph() {
	/**
	 * Workflow Analysis Node - Analyze coordination requirements
	 */
	const workflowAnalysis = async (
		state: CoordinationState,
	): Promise<Partial<CoordinationState>> => {
		const lastMessage = state.messages[state.messages.length - 1];
		const content = typeof lastMessage?.content === 'string' ? lastMessage.content : '';

		// Analyze workflow requirements
		const coordinationPlan = analyzeWorkflowRequirements(content);

		return {
			currentStep: 'agent_discovery',
			coordinationPlan,
			context: {
				...state.context,
				analysisTimestamp: new Date().toISOString(),
			},
		};
	};

	/**
	 * Agent Discovery Node - Discover and select agents for coordination
	 */
	const agentDiscovery = async (state: CoordinationState): Promise<Partial<CoordinationState>> => {
		const { coordinationPlan } = state;

		if (!coordinationPlan) {
			return {
				currentStep: 'error_handling',
				error: 'No coordination plan available for agent discovery',
			};
		}

		// Update agent statuses based on discovery
		const agentStatuses = await discoverAgents(coordinationPlan.participants);

		return {
			currentStep: 'communication_setup',
			agentStatuses,
		};
	};

	/**
	 * Communication Setup Node - Setup communication channels
	 */
	const communicationSetup = async (
		state: CoordinationState,
	): Promise<Partial<CoordinationState>> => {
		const { coordinationPlan, agentStatuses } = state;

		if (!coordinationPlan || !agentStatuses) {
			return {
				currentStep: 'error_handling',
				error: 'Missing coordination plan or agent statuses',
			};
		}

		// Setup communication channels
		const communicationLog = setupCommunicationChannels(coordinationPlan, agentStatuses);

		return {
			currentStep: 'workflow_orchestration',
			communicationLog,
		};
	};

	/**
	 * Workflow Orchestration Node - Orchestrate the workflow
	 */
	const workflowOrchestration = async (
		state: CoordinationState,
	): Promise<Partial<CoordinationState>> => {
		const { coordinationPlan, agentStatuses, communicationLog } = state;

		if (!coordinationPlan) {
			return {
				currentStep: 'error_handling',
				error: 'No coordination plan for orchestration',
			};
		}

		// Execute workflow orchestration
		const orchestrationResult = await orchestrateWorkflow(
			coordinationPlan,
			agentStatuses || {},
			communicationLog || [],
		);

		return {
			currentStep: 'synchronization',
			result: orchestrationResult,
			communicationLog: [...(communicationLog || []), ...orchestrationResult.newCommunications],
		};
	};

	/**
	 * Synchronization Node - Synchronize agent states
	 */
	const synchronization = async (state: CoordinationState): Promise<Partial<CoordinationState>> => {
		const { agentStatuses, communicationLog } = state;

		// Synchronize agent states
		const syncResult = await synchronizeAgents(agentStatuses || {}, communicationLog || []);

		return {
			currentStep: 'response_generation',
			agentStatuses: syncResult.updatedStatuses,
			result: {
				...(typeof state.result === 'object' && state.result !== null ? state.result : {}),
				synchronization: syncResult,
			},
		};
	};

	/**
	 * Response Generation Node - Generate final response
	 */
	const responseGeneration = async (
		state: CoordinationState,
	): Promise<Partial<CoordinationState>> => {
		const { result, coordinationPlan, agentStatuses } = state;

		const coordinationResult = {
			workflow: coordinationPlan?.workflow || 'unknown',
			participatingAgents: coordinationPlan?.participants?.length || 0,
			successfulCoordination: Object.values(agentStatuses || {}).filter(
				(s) => s.status === 'complete',
			).length,
			summary: generateCoordinationSummary(result, coordinationPlan, agentStatuses),
		};

		const responseContent = generateCoordinationResponse(coordinationResult);
		const responseMessage = new AIMessage({ content: responseContent });

		return {
			currentStep: END,
			messages: [...state.messages, responseMessage],
			result: coordinationResult,
		};
	};

	/**
	 * Error Handling Node
	 */
	const errorHandling = async (state: CoordinationState): Promise<Partial<CoordinationState>> => {
		const error = state.error || 'Unknown error in coordination';

		const errorResponse = new AIMessage({
			content: `Coordination failed: ${error}`,
		});

		return {
			currentStep: END,
			messages: [...state.messages, errorResponse],
			error,
		};
	};

	// Build workflow
	const workflow = new StateGraph(CoordinationStateAnnotation)
		.addNode('workflow_analysis', workflowAnalysis)
		.addNode('agent_discovery', agentDiscovery)
		.addNode('communication_setup', communicationSetup)
		.addNode('workflow_orchestration', workflowOrchestration)
		.addNode('synchronization', synchronization)
		.addNode('response_generation', responseGeneration)
		.addNode('error_handling', errorHandling)
		.addEdge(START, 'workflow_analysis')
		.addEdge('workflow_analysis', 'agent_discovery')
		.addEdge('agent_discovery', 'communication_setup')
		.addEdge('communication_setup', 'workflow_orchestration')
		.addEdge('workflow_orchestration', 'synchronization')
		.addEdge('synchronization', 'response_generation')
		.addEdge('error_handling', END);

	// Add conditional routing for error handling
	workflow.addConditionalEdges(
		'agent_discovery',
		(state: CoordinationState) => {
			return state.error ? 'error_handling' : 'communication_setup';
		},
		{
			communication_setup: 'communication_setup',
			error_handling: 'error_handling',
		},
	);

	workflow.addConditionalEdges(
		'communication_setup',
		(state: CoordinationState) => {
			return state.error ? 'error_handling' : 'workflow_orchestration';
		},
		{
			workflow_orchestration: 'workflow_orchestration',
			error_handling: 'error_handling',
		},
	);

	return workflow.compile();
}

// Helper functions

function analyzeWorkflowRequirements(content: string): {
	workflow: string;
	participants: string[];
	dependencies: Record<string, string[]>;
	timeline: Array<{ agent: string; action: string; order: number }>;
} {
	const keywords = content.toLowerCase();

	// Determine workflow type
	let workflow = 'simple';
	if (keywords.includes('complex') || keywords.includes('multi-step')) workflow = 'complex';
	if (keywords.includes('parallel') || keywords.includes('concurrent')) workflow = 'parallel';
	if (keywords.includes('sequential') || keywords.includes('ordered')) workflow = 'sequential';

	// Identify required participants
	const participants: string[] = [];
	if (keywords.includes('analyze') || keywords.includes('plan')) {
		participants.push('intelligence-scheduler-agent');
	}
	if (keywords.includes('tool') || keywords.includes('execute')) {
		participants.push('tool-layer-agent');
	}
	if (keywords.includes('deploy') || keywords.includes('surface')) {
		participants.push('execution-surface-agent');
	}

	// Default to all agents if none specifically identified
	if (participants.length === 0) {
		participants.push(
			'intelligence-scheduler-agent',
			'tool-layer-agent',
			'execution-surface-agent',
		);
	}

	// Create dependencies
	const dependencies: Record<string, string[]> = {};
	for (let i = 1; i < participants.length; i++) {
		dependencies[participants[i]] = [participants[i - 1]];
	}

	// Create timeline
	const timeline = participants.map((agent, index) => ({
		agent,
		action: `execute_${workflow}_workflow`,
		order: index + 1,
	}));

	return { workflow, participants, dependencies, timeline };
}

async function discoverAgents(participants: string[]): Promise<
	Record<
		string,
		{
			status: AgentStatus;
			lastUpdate: string;
			currentTask?: string;
		}
	>
> {
	const agentStatuses: Record<
		string,
		{
			status: AgentStatus;
			lastUpdate: string;
			currentTask?: string;
		}
	> = {};

	// Simulate agent discovery
	for (const participant of participants) {
		agentStatuses[participant] = {
			status: 'idle',
			lastUpdate: new Date().toISOString(),
		};
	}

	return agentStatuses;
}

function setupCommunicationChannels(
	coordinationPlan: {
		workflow: string;
		participants: string[];
		dependencies: Record<string, string[]>;
		timeline: Array<{ agent: string; action: string; order: number }>;
	},
	_agentStatuses: Record<
		string,
		{
			status: AgentStatus;
			lastUpdate: string;
			currentTask?: string;
		}
	>,
): Array<{
	from: string;
	to: string;
	message: string;
	timestamp: string;
	type: MessageType;
}> {
	const communicationLog: Array<{
		from: string;
		to: string;
		message: string;
		timestamp: string;
		type: MessageType;
	}> = [];

	// Setup initial communications
	for (const participant of coordinationPlan.participants) {
		communicationLog.push({
			from: 'coordination-agent',
			to: participant,
			message: `Setting up communication for ${coordinationPlan.workflow} workflow`,
			timestamp: new Date().toISOString(),
			type: 'notification',
		});
	}

	return communicationLog;
}

async function orchestrateWorkflow(
	coordinationPlan: {
		workflow: string;
		participants: string[];
		dependencies: Record<string, string[]>;
		timeline: Array<{ agent: string; action: string; order: number }>;
	},
	_agentStatuses: Record<
		string,
		{
			status: AgentStatus;
			lastUpdate: string;
			currentTask?: string;
		}
	>,
	_communicationLog: Array<{
		from: string;
		to: string;
		message: string;
		timestamp: string;
		type: MessageType;
	}>,
): Promise<{
	workflowStatus: 'completed' | 'failed' | 'partial';
	executedSteps: number;
	newCommunications: Array<{
		from: string;
		to: string;
		message: string;
		timestamp: string;
		type: MessageType;
	}>;
}> {
	const newCommunications: Array<{
		from: string;
		to: string;
		message: string;
		timestamp: string;
		type: MessageType;
	}> = [];

	// Execute workflow steps
	const sortedTimeline = [...coordinationPlan.timeline].sort((a, b) => a.order - b.order);
	for (const step of sortedTimeline) {
		// Send execution request
		newCommunications.push({
			from: 'coordination-agent',
			to: step.agent,
			message: `Execute: ${step.action}`,
			timestamp: new Date().toISOString(),
			type: 'request',
		});

		// Simulate agent response
		await new Promise((resolve) => setTimeout(resolve, 100));

		newCommunications.push({
			from: step.agent,
			to: 'coordination-agent',
			message: `Completed: ${step.action}`,
			timestamp: new Date().toISOString(),
			type: 'response',
		});
	}

	return {
		workflowStatus: 'completed',
		executedSteps: coordinationPlan.timeline.length,
		newCommunications,
	};
}

async function synchronizeAgents(
	agentStatuses: Record<
		string,
		{
			status: AgentStatus;
			lastUpdate: string;
			currentTask?: string;
		}
	>,
	communicationLog: Array<{
		from: string;
		to: string;
		message: string;
		timestamp: string;
		type: MessageType;
	}>,
): Promise<{
	updatedStatuses: Record<
		string,
		{
			status: AgentStatus;
			lastUpdate: string;
			currentTask?: string;
		}
	>;
	syncSuccess: boolean;
}> {
	const updatedStatuses = { ...agentStatuses };

	// Update agent statuses based on communication log
	for (const [agentName] of Object.entries(agentStatuses)) {
		const agentCommunications = communicationLog.filter(
			(comm) => comm.to === agentName || comm.from === agentName,
		);

		// Update status based on last communication
		if (agentCommunications.length > 0) {
			updatedStatuses[agentName] = {
				...updatedStatuses[agentName],
				status: 'complete',
				lastUpdate: new Date().toISOString(),
			};
		}
	}

	return {
		updatedStatuses,
		syncSuccess: true,
	};
}

function generateCoordinationSummary(
	_result: unknown,
	coordinationPlan:
		| {
				workflow: string;
				participants: string[];
				dependencies: Record<string, string[]>;
				timeline: Array<{ agent: string; action: string; order: number }>;
		  }
		| undefined,
	agentStatuses:
		| Record<
				string,
				{
					status: AgentStatus;
					lastUpdate: string;
					currentTask?: string;
				}
		  >
		| undefined,
): string {
	const totalAgents = coordinationPlan?.participants?.length || 0;
	const completedAgents = Object.values(agentStatuses || {}).filter(
		(s) => s.status === 'complete',
	).length;

	if (totalAgents === 0) return 'No agents coordinated';

	return `Coordinated ${totalAgents} agents in ${coordinationPlan?.workflow || 'unknown'} workflow, ${completedAgents} completed successfully`;
}

function generateCoordinationResponse(result: {
	workflow: string;
	participatingAgents: number;
	successfulCoordination: number;
	summary: string;
}): string {
	const successRate =
		result.participatingAgents > 0
			? (result.successfulCoordination / result.participatingAgents) * 100
			: 0;

	return `Coordination complete for ${result.workflow} workflow. ${result.summary}. Success rate: ${successRate.toFixed(1)}%`;
}

/**
 * Factory function to create Coordination Agent
 */
export function createCoordinationAgent(config?: Partial<CoordinationConfig>): CoordinationAgent {
	const defaultConfig: CoordinationConfig = {
		name: 'coordination-agent',
		maxCoordinatedAgents: 10,
		coordinationTimeout: 120000,
		enableWorkflowManagement: true,
		communicationProtocol: 'a2a',
		...config,
	};

	return new CoordinationAgent(defaultConfig);
}
