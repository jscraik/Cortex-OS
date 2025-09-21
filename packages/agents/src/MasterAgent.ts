/**
 * brAInwav Master Agent Coordinator with LangGraphJS
 *
 * Implements master-agent coordination using LangGraphJS following the
 * Cortex-OS adoption plan and architecture diagram pattern.
 */

// import fs from 'node:fs';
// import path from 'node:path';
// Adapters (mocked in tests)
// import { MLXAdapter } from '@cortex-os/model-gateway/dist/adapters/mlx-adapter.js';
// import { OllamaAdapter } from '@cortex-os/model-gateway/dist/adapters/ollama-adapter.js';
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
	// Optional per-subagent overrides used by router/model fallback
	fallback_model: z.string().optional(),
	fallback_tier: z.enum(['ultra_fast', 'balanced', 'high_performance']).optional(),
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
	const toolLayer = (state: AgentState): AgentState => {
		// const lastMessage = state.messages[state.messages.length - 1];
		// const content = lastMessage?.content || '';
		const { currentAgent } = state;

		if (!currentAgent) {
			return {
				...state,
				error: 'No agent selected',
			};
		}

		try {
			// Decide model execution path: prefer MLX if available, else Ollama by specialization-tier
			// const _text = typeof content === 'string' ? content : JSON.stringify(content);
			// const sub = agentRegistry.get(currentAgent);
			// const _specialization = sub?.specialization ?? state.taskType ?? 'code-analysis';

			// Try MLX first
			// const mlx = new MLXAdapter();
			const executed = false;
			let result: unknown;
			// try {
			// 	if (await mlx.isAvailable()) {
			// 		result = await mlx.generateChat({ content: text });
			// 		executed = true;
			// 	}
			// } catch {
			// 	// ignore and fallback
			// }

			if (!executed) {
				// const { modelTag } = selectOllamaModelBySpecializationTier(specialization);
				// const ollama = new OllamaAdapter();
				// result = await ollama.generateChat({ content: text }, modelTag);
				result = 'Mock adapter response - adapters not yet implemented';
			}

			return {
				...state,
				result,
				messages: [new AIMessage({ content: JSON.stringify(result) })],
			};
		} catch (error) {
			return {
				...state,
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
			return result;
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

export type MasterAgentGraph = ReturnType<typeof createMasterAgentGraph>;

// -- Helpers --
// type OllamaConfig = {
// 	chat_models: Record<string, { ollama_model?: string }>;
// 	performance_tiers: Record<string, { models: string[] }>;
// };

// const loadOllamaConfig = (): OllamaConfig | null => {
// 	try {
// 		const cfgDir = process.env.CORTEX_CONFIG_DIR || path.resolve(process.cwd(), 'config');
// 		const cfgPath = path.resolve(cfgDir, 'ollama-models.json');
// 		const raw = fs.readFileSync(cfgPath, 'utf8');
// 		return JSON.parse(raw) as OllamaConfig;
// 	} catch {
// 		return null;
// 	}
// };

// const specializationToTier = (spec: string): 'ultra_fast' | 'balanced' | 'high_performance' => {
// 	switch (spec) {
// 		case 'documentation':
// 			return 'balanced';
// 		case 'security':
// 			return 'high_performance';
// 		default:
// 			return 'ultra_fast';
// 	}
// };

// const _selectOllamaModelBySpecializationTier = (
// 	_specialization: string,
// ): { modelKey: string; modelTag: string } => {
// 	const cfg = loadOllamaConfig();
// 	const tier = specializationToTier(_specialization);
// 	const models = cfg?.performance_tiers?.[tier]?.models ?? [];
// 	const firstKey = models[0] || 'deepseek-coder';
// 	const tag = cfg?.chat_models?.[firstKey]?.ollama_model || firstKey;
// 	return { modelKey: firstKey, modelTag: tag };
// };
