/**
 * CortexAgent - Full LangGraphJS-based implementation
 *
 * Implements the main agent using LangGraphJS for complete workflow orchestration,
 * state management, and tool coordination. This replaces the simplified implementation.
 */

import { EventEmitter } from 'node:events';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { Annotation, END, MessagesAnnotation, START, StateGraph } from '@langchain/langgraph';
import { z } from 'zod';
import { type MasterAgentGraph, type SubAgentConfig, createMasterAgentGraph } from './MasterAgent';
import type { AgentConfig } from './lib/types';

// Extended state for CortexAgent workflows
export const CortexStateAnnotation = Annotation.Root({
	...MessagesAnnotation.spec,
	currentStep: Annotation<string>,
	context: Annotation<Record<string, unknown>>(),
	tools: Annotation<Array<{ name: string; description: string }>>(),
	securityCheck: Annotation<{ passed: boolean; risk: string } | undefined>(),
	memory: Annotation<Array<{ content: string; timestamp: string }>>(),
	result: Annotation<unknown>(),
	error: Annotation<string | undefined>(),
});

export type CortexState = typeof CortexStateAnnotation.State;

// Tool execution configuration
export const ToolConfigSchema = z.object({
	name: z.string(),
	description: z.string(),
	schema: z.record(z.unknown()),
	handler: z.function(),
});

export type ToolConfig = z.infer<typeof ToolConfigSchema>;

/**
 * CortexAgent with full LangGraphJS implementation
 */
export class CortexAgent extends EventEmitter {
	private graph: ReturnType<typeof createAgentGraph>;
	public masterAgentGraph: MasterAgentGraph;
	private config: AgentConfig;

	constructor(config: AgentConfig) {
		super();
		this.config = config;

		// Initialize master agent graph for sub-agent coordination
		this.masterAgentGraph = createMasterAgentGraph({
			name: config.name,
			subAgents: this.createSubAgents(),
			mcpEndpoint: config.mcpEndpoint,
		});

		// Create main agent workflow graph
		this.graph = createAgentGraph(this);
	}

	/**
	 * Execute agent workflow with LangGraphJS
	 */
	async execute(
		input: string,
		options?: {
			stream?: boolean;
			tools?: ToolConfig[];
			context?: Record<string, unknown>;
		},
	): Promise<CortexState> {
		const initialState: CortexState = {
			messages: [new HumanMessage({ content: input })],
			currentStep: 'input_processing',
			context: options?.context || {},
			tools:
				options?.tools?.map((t: any) => ({
					name: t.name || t,
					description: t.description || '',
				})) || [],
			securityCheck: undefined,
			memory: [],
			result: undefined,
			error: undefined,
		};

		if (options?.stream) {
			return this.streamExecution(initialState);
		}

		return await this.graph.invoke(initialState);
	}

	/**
	 * Execute with streaming support
	 */
	private async streamExecution(initialState: CortexState): Promise<CortexState> {
		const streamResult = this.graph.stream(initialState, {
			streamMode: this.config.streamingMode || 'updates',
		});

		let finalState = initialState;

		// Handle different types of stream results
		if (Symbol.asyncIterator in streamResult) {
			// It's an async iterator
			for await (const chunk of streamResult as AsyncIterable<any>) {
				// Handle different streaming modes
				if (this.config.streamingMode === 'values') {
					finalState = chunk;
				} else {
					// updates mode - merge with current state
					finalState = { ...finalState, ...chunk };
				}
				// Emit events for real-time updates
				this.emit('update', finalState);
				// Also emit progress events
				this.emit('progress', {
					step: finalState.currentStep,
					timestamp: new Date().toISOString(),
				});
			}
		} else {
			// Handle as a readable stream or other format
			console.warn('Stream result is not iterable:', streamResult);
		}

		return finalState;
	}

	/**
	 * Get agent status with LangGraphJS state
	 */
	async getStatus(): Promise<{
		status: string;
		model: string;
		tools: string[];
		subagents: Array<{ name: string; status: string }>;
		graphState: Partial<CortexState>;
	}> {
		return {
			status: 'healthy',
			model: this.config.model || 'glm-4.5-mlx',
			tools: this.config.tools?.map((t: any) => t.name) || [],
			subagents: Array.from(this.masterAgentGraph.agentRegistry.values()).map((agent) => ({
				name: agent.name,
				status: 'ready',
			})),
			graphState: {
				currentStep: 'idle',
				tools:
					this.config.tools?.map((t) => ({
						name: (t as any).name || t,
						description: (t as any).description || '',
					})) || [],
			},
		};
	}

	/**
	 * Create sub-agent configurations
	 */
	private createSubAgents(): SubAgentConfig[] {
		return [
			{
				name: 'code-analysis-agent',
				description: 'Code quality and security analysis specialist',
				capabilities: ['code-analysis', 'security-scan', 'quality-review'],
				specialization: 'code-analysis',
				model_targets: ['glm-4.5-mlx'],
				tools: ['code-analyzer', 'security-scanner'],
			},
			{
				name: 'test-generation-agent',
				description: 'Automated test generation specialist',
				capabilities: ['test-generation', 'spec-analysis', 'coverage-report'],
				specialization: 'test-generation',
				model_targets: ['glm-4.5-mlx'],
				tools: ['test-generator', 'coverage-analyzer'],
			},
			{
				name: 'documentation-agent',
				description: 'Documentation generation and update specialist',
				capabilities: ['doc-generation', 'readme-update', 'api-docs'],
				specialization: 'documentation',
				model_targets: ['glm-4.5-mlx'],
				tools: ['doc-generator', 'markdown-formatter'],
			},
			{
				name: 'security-agent',
				description: 'Security vulnerability detection and analysis',
				capabilities: ['security-audit', 'vulnerability-scan', 'compliance-check'],
				specialization: 'security',
				model_targets: ['glm-4.5-mlx'],
				tools: ['security-scanner', 'compliance-checker'],
			},
		];
	}
}

/**
 * Create LangGraphJS workflow for CortexAgent
 */
function createAgentGraph(agent: CortexAgent) {
	/**
	 * Input Processing Node
	 */
	const inputProcessing = async (state: CortexState): Promise<Partial<CortexState>> => {
		const lastMessage = state.messages[state.messages.length - 1];
		const content = lastMessage?.content || '';

		return {
			currentStep: 'security_check',
			context: {
				...state.context,
				inputLength: typeof content === 'string' ? content.length : 0,
				timestamp: new Date().toISOString(),
			},
		};
	};

	/**
	 * Security Check Node
	 */
	const securityCheck = async (state: CortexState): Promise<Partial<CortexState>> => {
		// Implement security validation
		const securityResult = await performSecurityCheck(state.messages);

		return {
			currentStep: 'intelligence_routing',
			securityCheck: securityResult,
		};
	};

	/**
	 * Intelligence Routing Node
	 */
	const intelligenceRouting = async (state: CortexState): Promise<Partial<CortexState>> => {
		if (state.securityCheck?.passed === false) {
			return {
				currentStep: 'error_handling',
				error: 'Security check failed',
			};
		}

		// Route to master agent for sub-agent coordination
		const lastMessage = state.messages[state.messages.length - 1];
		const content =
			typeof lastMessage?.content === 'string'
				? lastMessage.content
				: JSON.stringify(lastMessage?.content || '');
		const masterResult = await agent.masterAgentGraph.coordinate(content);

		return {
			currentStep: 'response_generation',
			result: masterResult.result,
			messages: [...state.messages, ...masterResult.messages],
		};
	};

	/**
	 * Response Generation Node
	 */
	const responseGeneration = async (state: CortexState): Promise<Partial<CortexState>> => {
		const response = new AIMessage({
			content: generateResponse(state),
		});

		return {
			currentStep: 'memory_update',
			messages: [...state.messages, response],
		};
	};

	/**
	 * Memory Update Node
	 */
	const memoryUpdate = async (state: CortexState): Promise<Partial<CortexState>> => {
		// Store in memory system
		const memoryEntry = {
			content: JSON.stringify({
				input: state.messages[0]?.content,
				output: state.messages[state.messages.length - 1]?.content,
				toolsUsed: state.tools?.map((t) => t.name),
			}),
			timestamp: new Date().toISOString(),
		};

		return {
			currentStep: END,
			memory: [...(state.memory || []), memoryEntry],
			result: undefined,
			error: undefined,
		};
	};

	/**
	 * Error Handling Node
	 */
	const errorHandling = async (state: CortexState): Promise<Partial<CortexState>> => {
		const errorResponse = new AIMessage({
			content: `I encountered an error: ${state.error || 'Unknown error'}. Please try again.`,
		});

		return {
			currentStep: END,
			messages: [...state.messages, errorResponse],
			error: state.error,
			result: undefined,
		};
	};

	// Build the workflow graph
	const workflow = new StateGraph(CortexStateAnnotation)
		.addNode('input_processing', inputProcessing)
		.addNode('security_check', securityCheck)
		.addNode('intelligence_routing', intelligenceRouting)
		.addNode('response_generation', responseGeneration)
		.addNode('memory_update', memoryUpdate)
		.addNode('error_handling', errorHandling)
		.addEdge(START, 'input_processing')
		.addEdge('input_processing', 'security_check')
		.addEdge('security_check', 'intelligence_routing')
		.addEdge('intelligence_routing', 'response_generation')
		.addEdge('response_generation', 'memory_update')
		.addEdge('error_handling', END);

	// Add conditional routing
	workflow.addConditionalEdges(
		'security_check',
		(state: CortexState) => {
			if (state.securityCheck?.passed === false) {
				return 'error_handling';
			}
			return 'intelligence_routing';
		},
		{
			intelligence_routing: 'intelligence_routing',
			error_handling: 'error_handling',
		},
	);

	return workflow.compile();
}

/**
 * Perform security check on input
 */
async function performSecurityCheck(messages: any[]): Promise<{ passed: boolean; risk: string }> {
	// Simplified security check
	const lastMessage = messages[messages.length - 1];
	const content = lastMessage?.content || '';

	// Basic prompt injection detection
	const suspiciousPatterns = [
		/ignore previous instructions/i,
		/bypass security/i,
		/system prompt/i,
	];

	const hasSuspiciousPattern = suspiciousPatterns.some((pattern) =>
		pattern.test(typeof content === 'string' ? content : ''),
	);

	return {
		passed: !hasSuspiciousPattern,
		risk: hasSuspiciousPattern ? 'high' : 'low',
	};
}

/**
 * Generate final response
 */
function generateResponse(state: CortexState): string {
	if (state.result) {
		return typeof state.result === 'string' ? state.result : JSON.stringify(state.result);
	}

	// Default response
	const lastMessage = state.messages[state.messages.length - 2];
	return `I've processed your request: "${lastMessage?.content || 'No input'}"`;
}
