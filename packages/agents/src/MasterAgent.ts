/**
 * brAInwav Master Agent Coordinator with LangGraphJS
 *
 * Implements master-agent coordination using LangGraphJS following the
 * Cortex-OS adoption plan and architecture diagram pattern.
 */

import { randomUUID } from 'node:crypto';
import { getHooksSingleton } from '@cortex-os/hooks';
import {
	createMLXAdapter,
	createOllamaAdapter,
	type MLXAdapterApi,
	type OllamaAdapterApi,
} from '@cortex-os/model-gateway';
import {
	agentStateToN0,
	dispatchTools,
	type N0AdapterOptions,
	type N0Budget,
	type N0Session,
	type N0State,
	type ToolDispatchJob,
	type ToolDispatchResult,
} from '@cortex-os/orchestration';
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
	const toolLayer = async (state: AgentState): Promise<AgentState> => {
		const currentAgent = state.currentAgent;
		if (!currentAgent) return state;
		const rawContent = extractContent(state.messages[state.messages.length - 1]);
		const conversation = createConversation(currentAgent, rawContent);
		const session = createSession(state, currentAgent);
		const { jobs, errors } = await buildToolJobs(
			conversation,
			currentAgent,
			state.taskType,
			agentRegistry,
		);
		const traceId = randomUUID();
		if (jobs.length === 0) {
			const outcome = finalizeToolExecution([], errors, traceId);
			return applyExecutionOutcome(state, outcome);
		}
		const hooks = getHooksSingleton();
		const hookAdapter = hooks
			? {
					run: async (event: 'PreToolUse' | 'PostToolUse', ctx: Record<string, unknown>) => {
						const hookResults = await hooks.run(event, ctx as any);
						// Return the results directly since they're already HookResult[]
						return hookResults;
					},
				}
			: undefined;
		const dispatchResults = await dispatchTools(jobs, {
			session,
			hooks: hookAdapter,
			budget: deriveBudget(),
			concurrency: 1,
		});
		const outcome = finalizeToolExecution(dispatchResults, errors, traceId);
		return applyExecutionOutcome(state, outcome);
	};

	type ConversationMessage = { role: 'system' | 'user'; content: string };
	type ToolPayload = { content: string; model: string };
	interface ToolExecutionOutcome {
		execution: {
			provider: 'mlx' | 'ollama' | 'none';
			executed: boolean;
			traceId: string;
			payload?: ToolPayload;
			errors: string[];
		};
		response: string;
		error?: string;
	}

	function extractContent(message: AIMessage | HumanMessage | undefined): string {
		if (!message) return '';
		return typeof message.content === 'string' ? message.content : JSON.stringify(message.content);
	}

	function createConversation(agent: string, input: string): ConversationMessage[] {
		return [
			{ role: 'system', content: `You are brAInwav agent ${agent}.` },
			{ role: 'user', content: input },
		];
	}

	function createSession(state: AgentState, agent: string): N0Session {
		return {
			id: `master-agent:${agent}`,
			model: state.taskType ?? 'mlx-orchestration',
			user: 'brAInwav-agent',
			cwd: process.cwd(),
		};
	}

	async function buildToolJobs(
		conversation: ConversationMessage[],
		agent: string,
		taskType: string | undefined,
		agents: Map<string, SubAgentConfig>,
	): Promise<{ jobs: ToolDispatchJob<ToolPayload>[]; errors: string[] }> {
		const jobs: ToolDispatchJob<ToolPayload>[] = [];
		const errors: string[] = [];
		try {
			const mlx: MLXAdapterApi = createMLXAdapter();
                        if (await mlx.isAvailable()) {
                                jobs.push({
                                        id: `mlx:${agent}`,
                                        name: 'mlx.generateChat',
                                        input: conversation,
                                        estimateTokens: 2048,
                                        metadata: { provider: 'mlx', tags: ['agents', 'mlx'], brand: 'brAInwav' },
                                        execute: async () => mlx.generateChat({ messages: conversation }),
                                });
			} else {
				errors.push('brAInwav MLX adapter unavailable');
			}
		} catch (error) {
			errors.push(formatAdapterError('mlx', error));
		}
		try {
			const specialization = agents.get(agent)?.specialization ?? taskType ?? 'code-analysis';
			const modelHint = process.env.BRAINWAV_OLLAMA_MODEL ?? specialization;
			const ollama: OllamaAdapterApi = createOllamaAdapter();
                        jobs.push({
                                id: `ollama:${agent}`,
                                name: 'ollama.generateChat',
                                input: conversation,
                                estimateTokens: 2048,
                                metadata: {
                                        provider: 'ollama',
                                        tags: ['agents', 'ollama'],
                                        model: modelHint,
                                        brand: 'brAInwav',
                                },
                                execute: async () => ollama.generateChat(conversation, modelHint),
                        });
		} catch (error) {
			errors.push(formatAdapterError('ollama', error));
		}
		return { jobs, errors };
	}

	function deriveBudget(): N0Budget {
		return { tokens: 8192, timeMs: 120000, depth: 1 };
	}

	function finalizeToolExecution(
		results: ToolDispatchResult<ToolPayload>[] | undefined,
		errors: string[],
		traceId: string,
	): ToolExecutionOutcome {
		const collected = [...errors];
		const settled = (results ?? []).filter(Boolean);
		const success = settled.find((r) => r.status === 'fulfilled' && r.value);
		for (const result of settled) {
			if (result && result.status !== 'fulfilled' && result.reason) {
				collected.push(result.reason.message);
			}
		}
		if (success?.value) {
			return {
				execution: {
					provider: (success.metadata?.provider as 'mlx' | 'ollama') ?? 'none',
					executed: true,
					traceId,
					payload: success.value,
					errors: collected,
				},
				response: success.value.content,
				error: collected.length ? collected.join('; ') : undefined,
			};
		}
		const message = collected.length
			? collected.join('; ')
			: 'brAInwav tool dispatch failed with no available provider';
		return {
			execution: {
				provider: 'none',
				executed: false,
				traceId,
				errors: collected,
			},
			response: message,
			error: message,
		};
	}

	function applyExecutionOutcome(state: AgentState, outcome: ToolExecutionOutcome): AgentState {
		const aiMessage = new AIMessage({ content: outcome.response });
		return {
			...state,
			result: outcome.execution,
			messages: [...state.messages, aiMessage],
			error: outcome.error,
		};
	}

	function formatAdapterError(provider: string, error: unknown): string {
		const detail = error instanceof Error ? error.message : String(error);
		return `brAInwav ${provider} adapter error: ${detail}`;
	}

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

		async coordinateWithN0(
			input: string,
			session: N0Session,
			options: N0AdapterOptions = {},
		): Promise<{ agent: AgentState; n0: N0State }> {
			const agent = await this.coordinate(input);
			const n0 = agentStateToN0(agent, session, options);
			return { agent, n0 };
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
