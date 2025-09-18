/**
 * brAInwav Master Agent Coordinator with LangGraphJS
 *
 * Implements master-agent coordination using LangGraphJS following the
 * Cortex-OS adoption plan and architecture diagram pattern.
 */

import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { Annotation, MessagesAnnotation, StateGraph } from '@langchain/langgraph';
import { z } from 'zod';

// Extended state annotation for agent coordination
export const AgentStateAnnotation = Annotation.Root({
	...MessagesAnnotation.spec,
	currentAgent: Annotation<string>(),
	taskType: Annotation<string>(),
	result: Annotation<unknown>(),
	error: Annotation<string | undefined>(),
});

export type AgentState = typeof AgentStateAnnotation.State;

// Sub-agent configuration
export const SubAgentConfigSchema = z.object({
	name: z.string().min(1),
	description: z.string().min(1),
	capabilities: z.array(z.string()),
	model_targets: z.array(z.string()).default(['glm-4.5-mlx']),
	tools: z.array(z.string()).default([]),
	specialization: z.enum(['code-analysis', 'test-generation', 'documentation', 'security']),
});

export type SubAgentConfig = z.infer<typeof SubAgentConfigSchema>;

/**
 * Create LangGraphJS-based master agent following architecture diagram
 */
export const createMasterAgentGraph = (config: {
	name: string;
	subAgents: SubAgentConfig[];
	mcpEndpoint?: string;
}) => {
	const { name, subAgents } = config;

	// Create agent registry
	const agentRegistry = new Map<string, SubAgentConfig>();
	for (const agent of subAgents) {
		agentRegistry.set(agent.name, agent);
	}

	/**
	 * Intelligence & Scheduler - Route to appropriate sub-agent
	 */
	const intelligenceScheduler = async (state: AgentState): Promise<Partial<AgentState>> => {
		const lastMessage = state.messages[state.messages.length - 1];
		const content = lastMessage?.content || '';

		// Simple capability-based routing (≤40 lines)
		const routing = routeToSpecializedAgent(
			typeof content === 'string' ? content : JSON.stringify(content),
			Array.from(agentRegistry.values()),
		);

		return {
			currentAgent: routing.agent,
			taskType: routing.specialization,
		};
	};

	/**
	 * Tool Layer - Execute via MCP
	 */
	const toolLayer = async (state: AgentState): Promise<Partial<AgentState>> => {
		const { currentAgent, messages } = state;

		if (!currentAgent) {
			return { error: 'No agent selected' };
		}

		const lastMessage = messages[messages.length - 1];
		const content = lastMessage?.content || '';

		try {
			// Simulate MCP tool execution
			const result = await executeMCPTool(`agent.${currentAgent}`, {
				message: typeof content === 'string' ? content : JSON.stringify(content),
				context: state.taskType,
			});

			return {
				result,
				messages: [new AIMessage({ content: JSON.stringify(result) })],
			};
		} catch (error) {
			return {
				error: error instanceof Error ? error.message : 'Execution failed',
			};
		}
	};

	/**
	 * Create the LangGraphJS StateGraph
	 */
	const workflow = new StateGraph(AgentStateAnnotation)
		.addNode('intelligence_scheduler', intelligenceScheduler)
		.addNode('tool_layer', toolLayer)
		.addEdge('__start__', 'intelligence_scheduler')
		.addEdge('intelligence_scheduler', 'tool_layer')
		.addEdge('tool_layer', '__end__');

	return {
		graph: workflow.compile(),
		name,
		agentRegistry,

		/**
		 * Execute coordination workflow
		 */
		async coordinate(input: string): Promise<AgentState> {
			const initialState: AgentState = {
				messages: [new HumanMessage({ content: input })],
				currentAgent: 'intelligence_scheduler',
				taskType: 'coordination',
				result: undefined,
				error: undefined,
			};

			const result = await this.graph.invoke(initialState);
			return result as AgentState;
		},
	};
};

/**
 * Route to specialized agent (≤40 lines)
 */
const routeToSpecializedAgent = (
	content: string,
	agents: SubAgentConfig[],
): { agent: string; specialization: string; confidence: number } => {
	const keywords = content.toLowerCase();
	let bestMatch = {
		agent: 'default',
		specialization: 'code-analysis',
		confidence: 0,
	};

	for (const agent of agents) {
		let score = 0;

		// Capability matching
		for (const capability of agent.capabilities) {
			if (keywords.includes(capability.toLowerCase())) {
				score += 0.3;
			}
		}

		// Specialization keywords
		const specMap: Record<string, string[]> = {
			'code-analysis': ['analyze', 'review', 'code', 'quality'],
			'test-generation': ['test', 'spec', 'unit', 'integration'],
			documentation: ['document', 'readme', 'docs', 'markdown'],
			security: ['security', 'vulnerability', 'audit', 'scan'],
		};

		const specKeywords = specMap[agent.specialization] || [];
		for (const keyword of specKeywords) {
			if (keywords.includes(keyword)) {
				score += 0.4;
			}
		}

		if (score > bestMatch.confidence) {
			bestMatch = {
				agent: agent.name,
				specialization: agent.specialization,
				confidence: score,
			};
		}
	}

	return bestMatch;
};

/**
 * Execute MCP tool call (≤40 lines)
 */
const executeMCPTool = async (
	toolName: string,
	parameters: Record<string, unknown>,
): Promise<unknown> => {
	// In production, this would call actual MCP endpoint
	// For now, simulate based on tool name
	console.log(`Executing ${toolName} with:`, parameters);

	const toolResponses: Record<string, unknown> = {
		'agent.code-analysis-agent': {
			issues: [],
			metrics: { complexity: 2, maintainability: 8 },
			summary: 'Code analysis completed successfully',
		},
		'agent.test-generation-agent': {
			testsGenerated: 5,
			coverage: 85,
			summary: 'Unit tests generated for target functions',
		},
		'agent.documentation-agent': {
			sectionsUpdated: 3,
			wordsAdded: 247,
			summary: 'Documentation updated with current implementation',
		},
		'agent.security-agent': {
			vulnerabilities: 0,
			riskLevel: 'low',
			summary: 'No security issues detected',
		},
	};

	return (
		toolResponses[toolName] || {
			success: false,
			error: `Unknown tool: ${toolName}`,
		}
	);
};

export type MasterAgentGraph = ReturnType<typeof createMasterAgentGraph>;
