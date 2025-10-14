/**
 * Tool Layer Agent
 *
 * Specialized sub-agent for tool execution, dashboard management, and AGUI integration
 * following the LangGraphJS framework pattern.
 *
 * Co-authored-by: brAInwav Development Team
 */

import { EventEmitter } from 'node:events';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import type { RunnableConfig } from '@langchain/core/runnables';
import { Annotation, END, MessagesAnnotation, START, StateGraph } from '@langchain/langgraph';
import type { AGUIBusIntegration } from '../integrations/AGUIBusIntegration.js';
import { createAGUIBusIntegration } from '../integrations/AGUIBusIntegration.js';
import { createPrefixedId, secureDelay, secureInt, secureRatio } from '../lib/secure-random.js';
import { type AGUIMCPTools, createAGUIMCPTools } from '../mcp/AGUIMCPTools.js';
import { AgentToolkitMCPTools } from '../mcp/AgentToolkitMCPTools.js';
import { ArxivMCPTools } from '../mcp/ArxivMCPTools.js';

// Tool Layer State with AGUI integration
export const ToolLayerStateAnnotation = Annotation.Root({
	...MessagesAnnotation.spec,
	currentStep: Annotation<string>,
	selectedTools:
		Annotation<
			Array<{
				name: string;
				description: string;
				parameters: Record<string, unknown>;
			}>
		>(),
	toolResults:
		Annotation<
			Array<{
				tool: string;
				result: unknown;
				status: 'success' | 'error';
				duration: number;
			}>
		>(),
	dashboard: Annotation<
		| {
				metrics: Record<string, number>;
				status: string;
				activeTools: number;
		  }
		| undefined
	>(),
	// AGUI-specific state
	uiComponents:
		Annotation<
			Array<{
				id: string;
				type: string;
				properties: Record<string, unknown>;
				rendered: boolean;
			}>
		>(),
	activeView: Annotation<
		| {
				viewId: string;
				components: string[];
				layout: 'grid' | 'flex' | 'stack';
		  }
		| undefined
	>(),
	userInteractions:
		Annotation<
			Array<{
				componentId: string;
				action: string;
				value?: unknown;
				timestamp: string;
			}>
		>(),
	context: Annotation<Record<string, unknown>>(),
	result: Annotation<unknown>(),
	error: Annotation<string | undefined>(),
});

export type ToolLayerState = typeof ToolLayerStateAnnotation.State;

// Configuration for Tool Layer Agent with AGUI support
export interface ToolLayerConfig {
	name: string;
	maxConcurrentTools: number;
	toolTimeout: number;
	enableDashboard: boolean;
	allowedTools: string[];
	// AGUI-specific configuration
	enableAGUI: boolean;
	defaultLayout: 'grid' | 'flex' | 'stack';
	maxUIComponents: number;
	// Agent Toolkit configuration
	enableAgentToolkit: boolean;
	codeSearchPaths: string[];
	validationEnabled: boolean;
	// arXiv research configuration
	enableArxivResearch: boolean;
	arxivServerSlug?: string;
	arxivSearchTool?: string;
	arxivMaxResults?: number;
}

/**
 * Tool Layer Agent - Handles tool execution, dashboard management, and AGUI integration
 */
export class ToolLayerAgent extends EventEmitter {
	private graph: ReturnType<typeof createToolLayerGraph>;
	private config: ToolLayerConfig;
	private availableTools: Map<string, { execute: (params: unknown) => Promise<unknown> }>;
	private aguiBusIntegration?: AGUIBusIntegration;
	private aguiMCPTools?: AGUIMCPTools;
	private agentToolkitMCPTools?: AgentToolkitMCPTools;
	private arxivMCPTools?: ArxivMCPTools;

	constructor(config: ToolLayerConfig) {
		super();
		this.config = config;
		this.availableTools = new Map();
		this.initializeTools();
		this.graph = createToolLayerGraph(this);

		// Initialize AGUI bus integration if enabled
		if (this.config.enableAGUI) {
			this.aguiBusIntegration = createAGUIBusIntegration(this.config.name);
			this.aguiMCPTools = createAGUIMCPTools();
			this.setupAGUIEventHandlers();
			this.registerAGUIMCPTools();
		}

		// Initialize Agent Toolkit integration if enabled
		if (this.config.enableAgentToolkit) {
			this.agentToolkitMCPTools = new AgentToolkitMCPTools();
			this.registerAgentToolkitMCPTools();
		}

		// Initialize arXiv MCP tools if enabled
		if (this.config.enableArxivResearch) {
			this.arxivMCPTools = new ArxivMCPTools({
				serverSlug: this.config.arxivServerSlug,
				defaultMaxResults: this.config.arxivMaxResults,
			});
			// Register tools asynchronously in the background
			this.registerArxivMCPTools().catch((error) => {
				console.error('brAInwav arXiv MCP tools registration failed during init', {
					component: 'agents',
					brand: 'brAInwav',
					error: error instanceof Error ? error.message : String(error),
				});
			});
		}
	}

	/**
	 * Execute tools in parallel
	 */
	async executeToolsInParallel(
		tools: Array<{
			name: string;
			description: string;
			parameters: Record<string, unknown>;
		}>,
	): Promise<
		Array<{
			tool: string;
			result: unknown;
			status: 'success' | 'error';
			duration: number;
		}>
	> {
		const results = await Promise.allSettled(
			tools.map(async (tool) => {
				const startTime = Date.now();
				try {
					// Execute tool via registered handler
					const toolHandler = this.availableTools.get(tool.name);
					if (!toolHandler) {
						throw new Error(`[brAInwav] Tool not found: ${tool.name}`);
					}

					const result = await toolHandler.execute(tool.parameters);
					return {
						tool: tool.name,
						result,
						status: 'success' as const,
						duration: Date.now() - startTime,
					};
				} catch (error) {
					console.error('brAInwav Tool execution failed', {
						component: 'agents',
						brand: 'brAInwav',
						tool: tool.name,
						error: error instanceof Error ? error.message : String(error),
						parameters: tool.parameters,
					});

					return {
						tool: tool.name,
						result: error instanceof Error ? error.message : String(error),
						status: 'error' as const,
						duration: Date.now() - startTime,
					};
				}
			}),
		);

		return results.map((result) => {
			if (result.status === 'fulfilled') {
				return result.value;
			} else {
				return {
					tool: 'unknown',
					result: result.reason,
					status: 'error' as const,
					duration: 0,
				};
			}
		});
	}

	/**
	 * Execute tool layer operations
	 */
	async execute(
		input: string,
		options?: {
			context?: Record<string, unknown>;
			config?: RunnableConfig;
		},
	): Promise<ToolLayerState> {
		const initialState: ToolLayerState = {
			messages: [new HumanMessage({ content: input })],
			currentStep: 'tool_selection',
			selectedTools: [],
			toolResults: [],
			dashboard: undefined,
			// AGUI initialization
			uiComponents: [],
			activeView: undefined,
			userInteractions: [],
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
	 * Initialize available tools including AGUI components
	 */
	private initializeTools(): void {
		// Register default tools
		this.availableTools.set('validator', {
			execute: async (params: unknown) => ({
				valid: true,
				details: `Validated: ${JSON.stringify(params)}`,
			}),
		});

		this.availableTools.set('monitor', {
			execute: async (params: unknown) => ({
				status: 'healthy',
				metrics: { cpu: 45, memory: 60 },
				monitored: JSON.stringify(params),
			}),
		});

		this.availableTools.set('dashboard', {
			execute: async (params: unknown) => ({
				dashboard: 'updated',
				widgets: 5,
				data: JSON.stringify(params),
			}),
		});

		this.availableTools.set('tool-executor', {
			execute: async (params: unknown) => ({
				executed: true,
				output: `Executed with: ${JSON.stringify(params)}`,
				timestamp: new Date().toISOString(),
			}),
		});

		// AGUI tools
		if (this.config.enableAGUI) {
			this.availableTools.set('ui-component', {
				execute: async (params: unknown) => {
					const componentData = params as {
						type: string;
						properties: Record<string, unknown>;
					};

					return {
						componentId: createPrefixedId(`ui-${Date.now()}`),
						type: componentData.type || 'button',
						properties: componentData.properties || {},
						rendered: true,
						timestamp: new Date().toISOString(),
					};
				},
			});

			this.availableTools.set('ui-render', {
				execute: async (params: unknown) => {
					const renderData = params as {
						viewId: string;
						components: string[];
						layout?: 'grid' | 'flex' | 'stack';
					};

					return {
						viewId: renderData.viewId || `view-${Date.now()}`,
						components: renderData.components || [],
						layout: renderData.layout || this.config.defaultLayout,
						rendered: true,
						timestamp: new Date().toISOString(),
					};
				},
			});

			this.availableTools.set('ui-interact', {
				execute: async (params: unknown) => {
					const interactionData = params as {
						componentId: string;
						action: string;
						value?: unknown;
					};

					return {
						interactionId: createPrefixedId(`int-${Date.now()}`),
						componentId: interactionData.componentId,
						action: interactionData.action || 'click',
						value: interactionData.value,
						processed: true,
						timestamp: new Date().toISOString(),
					};
				},
			});
		}
	}

	/**
	 * Get agent capabilities
	 */
	getCapabilities(): string[] {
		return ['tool-execution', 'dashboard', 'validation', 'monitoring'];
	}

	/**
	 * Get available tools
	 */
	getAvailableTools(): string[] {
		return Array.from(this.availableTools.keys()).filter((tool) =>
			this.config.allowedTools.includes(tool),
		);
	}

	/**
	 * Health check
	 */
	async healthCheck(): Promise<{ status: string; timestamp: string; tools: number }> {
		return {
			status: 'healthy',
			timestamp: new Date().toISOString(),
			tools: this.availableTools.size,
		};
	}

	/**
	 * Setup AGUI event handlers
	 */
	private setupAGUIEventHandlers(): void {
		if (!this.aguiBusIntegration) return;

		this.aguiBusIntegration.on('component:rendered', (data) => {
			this.emit('agui:component:rendered', data);
		});

		this.aguiBusIntegration.on('user:interaction', (data) => {
			this.emit('agui:user:interaction', data);
		});

		this.aguiBusIntegration.on('view:rendered', (data) => {
			this.emit('agui:view:rendered', data);
		});
	}

	/**
	 * Register AGUI MCP tools as available tools
	 */
	private registerAGUIMCPTools(): void {
		if (!this.aguiMCPTools) return;

		const mcpTools = this.aguiMCPTools.getAllTools();

		for (const mcpTool of mcpTools) {
			this.availableTools.set(mcpTool.name, {
				execute: async (params: unknown) => {
					try {
						return await mcpTool.execute(params);
					} catch (error) {
						return {
							success: false,
							error: error instanceof Error ? error.message : String(error),
							tool: mcpTool.name,
						};
					}
				},
			});
		}
	}

	/**
	 * Register Agent Toolkit MCP tools as available tools
	 */
	private registerAgentToolkitMCPTools(): void {
		if (!this.agentToolkitMCPTools) return;

		const mcpTools = this.agentToolkitMCPTools.getAllTools();

		for (const mcpTool of mcpTools) {
			this.availableTools.set(mcpTool.name, {
				execute: async (params: unknown) => {
					try {
						return await mcpTool.handler(params);
					} catch (error) {
						return {
							success: false,
							error: error instanceof Error ? error.message : String(error),
							tool: mcpTool.name,
						};
					}
				},
			});
		}
	}

	/**
	 * Register arXiv MCP tools as available tools
	 */
	private async registerArxivMCPTools(): Promise<void> {
		if (!this.arxivMCPTools) return;

		try {
			// Initialize the arXiv MCP tools
			await this.arxivMCPTools.initialize();

			// Get all tool descriptors
			const tools = this.arxivMCPTools.getTools();

			for (const tool of tools) {
				this.availableTools.set(tool.name, {
					execute: async (params: unknown) => {
						try {
							const result = await tool.handler(params);
							console.log('brAInwav arXiv tool executed successfully', {
								component: 'agents',
								brand: 'brAInwav',
								tool: tool.name,
								params,
							});
							return result;
						} catch (error) {
							console.error('brAInwav arXiv tool execution failed', {
								component: 'agents',
								brand: 'brAInwav',
								tool: tool.name,
								params,
								error: error instanceof Error ? error.message : String(error),
							});
							return {
								success: false,
								error: error instanceof Error ? error.message : String(error),
								tool: tool.name,
							};
						}
					},
				});
			}

			console.log('brAInwav arXiv MCP tools registered successfully', {
				component: 'agents',
				brand: 'brAInwav',
				tools: tools.map((t) => t.name),
			});
		} catch (error) {
			console.error('brAInwav failed to register arXiv MCP tools', {
				component: 'agents',
				brand: 'brAInwav',
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
}

/**
 * Create LangGraphJS workflow for Tool Layer Agent
 */
function createToolLayerGraph(agent: ToolLayerAgent) {
	/**
	 * Tool Selection Node - Select appropriate tools for the task
	 */
	const toolSelection = async (state: ToolLayerState): Promise<Partial<ToolLayerState>> => {
		const lastMessage = state.messages[state.messages.length - 1];
		const content = typeof lastMessage?.content === 'string' ? lastMessage.content : '';

		// Select tools based on content analysis
		const selectedTools = selectToolsForTask(content);

		return {
			currentStep: 'tool_execution',
			selectedTools,
			context: {
				...state.context,
				selectionTimestamp: new Date().toISOString(),
			},
		};
	};

	/**
	 * Tool Execution Node - Execute selected tools
	 */
	const toolExecution = async (state: ToolLayerState): Promise<Partial<ToolLayerState>> => {
		const { selectedTools } = state;

		if (!selectedTools || selectedTools.length === 0) {
			return {
				currentStep: 'dashboard_update',
				toolResults: [],
			};
		}

		// Execute tools in parallel via the agent
		const results = await agent.executeToolsInParallel(selectedTools);

		return {
			currentStep: 'dashboard_update',
			toolResults: results,
		};
	};

	/**
	 * Dashboard Update Node - Update dashboard with results
	 */
	const dashboardUpdate = async (state: ToolLayerState): Promise<Partial<ToolLayerState>> => {
		const { toolResults } = state;

		// Update dashboard metrics
		const dashboard = updateDashboard(toolResults || []);

		return {
			currentStep: 'response_generation',
			dashboard,
		};
	};

	/**
	 * Response Generation Node - Generate final response
	 */
	const responseGeneration = async (state: ToolLayerState): Promise<Partial<ToolLayerState>> => {
		const { toolResults, dashboard } = state;

		const result = {
			toolsExecuted: toolResults?.length || 0,
			successfulTools: toolResults?.filter((r) => r.status === 'success').length || 0,
			dashboard: dashboard || { metrics: {}, status: 'unknown', activeTools: 0 },
			summary: generateToolSummary(toolResults || []),
		};

		const responseContent = generateToolLayerResponse(result);
		const responseMessage = new AIMessage({ content: responseContent });

		return {
			currentStep: END,
			messages: [...state.messages, responseMessage],
			result,
		};
	};

	/**
	 * Error Handling Node
	 */
	const errorHandling = async (state: ToolLayerState): Promise<Partial<ToolLayerState>> => {
		const error = state.error || 'Unknown error in tool execution';

		const errorResponse = new AIMessage({
			content: `Tool layer execution failed: ${error}`,
		});

		return {
			currentStep: END,
			messages: [...state.messages, errorResponse],
			error,
		};
	};

	// Build workflow
	const workflow = new StateGraph(ToolLayerStateAnnotation)
		.addNode('tool_selection', toolSelection)
		.addNode('tool_execution', toolExecution)
		.addNode('dashboard_update', dashboardUpdate)
		.addNode('response_generation', responseGeneration)
		.addNode('error_handling', errorHandling)
		.addEdge(START, 'tool_selection')
		.addEdge('tool_selection', 'tool_execution')
		.addEdge('tool_execution', 'dashboard_update')
		.addEdge('dashboard_update', 'response_generation')
		.addEdge('error_handling', END);

	return workflow.compile();
}

// Helper functions

function selectToolsForTask(content: string): Array<{
	name: string;
	description: string;
	parameters: Record<string, unknown>;
}> {
	const keywords = content.toLowerCase();
	const tools: Array<{
		name: string;
		description: string;
		parameters: Record<string, unknown>;
	}> = [];

	if (keywords.includes('validate') || keywords.includes('check')) {
		tools.push({
			name: 'validator',
			description: 'Validates input and configuration',
			parameters: { input: content },
		});
	}

	if (keywords.includes('monitor') || keywords.includes('watch')) {
		tools.push({
			name: 'monitor',
			description: 'Monitors system health and metrics',
			parameters: { target: content },
		});
	}

	if (keywords.includes('dashboard') || keywords.includes('display')) {
		tools.push({
			name: 'dashboard',
			description: 'Updates dashboard and metrics',
			parameters: { data: content },
		});
	}

	if (keywords.includes('execute') || keywords.includes('run')) {
		tools.push({
			name: 'tool-executor',
			description: 'Executes specified tools',
			parameters: { command: content },
		});
	}

	// AGUI tool selection
	if (
		keywords.includes('ui') ||
		keywords.includes('component') ||
		keywords.includes('button') ||
		keywords.includes('form')
	) {
		tools.push({
			name: 'ui-component',
			description: 'Creates UI components',
			parameters: {
				type: extractUIComponentType(content),
				properties: { label: extractUILabel(content) || 'Component' },
			},
		});
	}

	if (keywords.includes('render') || keywords.includes('view') || keywords.includes('display')) {
		tools.push({
			name: 'ui-render',
			description: 'Renders UI views',
			parameters: {
				viewId: `view-${Date.now()}`,
				components: [],
				layout: 'flex',
			},
		});
	}

	if (keywords.includes('click') || keywords.includes('interact') || keywords.includes('user')) {
		tools.push({
			name: 'ui-interact',
			description: 'Handles UI interactions',
			parameters: {
				componentId: 'component-id',
				action: extractUIAction(content),
			},
		});
	}

	// Agent Toolkit tool selection
	if (keywords.includes('search') || keywords.includes('find') || keywords.includes('grep')) {
		tools.push({
			name: 'agent_toolkit_search',
			description: 'Search for patterns in code using ripgrep',
			parameters: {
				pattern: extractSearchPattern(content) || content.trim(),
				path: extractSearchPath(content) || './src',
			},
		});
	}

	if (keywords.includes('multi') && (keywords.includes('search') || keywords.includes('find'))) {
		tools.push({
			name: 'agent_toolkit_multi_search',
			description: 'Perform comprehensive multi-pattern search',
			parameters: {
				pattern: extractSearchPattern(content) || content.trim(),
				path: extractSearchPath(content) || './src',
			},
		});
	}

	if (
		keywords.includes('refactor') ||
		keywords.includes('modify') ||
		keywords.includes('codemod') ||
		keywords.includes('transform')
	) {
		const findReplacePatterns = extractFindReplacePatterns(content);
		tools.push({
			name: 'agent_toolkit_codemod',
			description: 'Perform structural code modifications using Comby',
			parameters: {
				find: findReplacePatterns.find || 'pattern_to_find',
				replace: findReplacePatterns.replace || 'replacement_pattern',
				path: extractSearchPath(content) || './src',
			},
		});
	}

	if (
		keywords.includes('lint') ||
		keywords.includes('validate') ||
		keywords.includes('analyze') ||
		keywords.includes('quality')
	) {
		tools.push({
			name: 'agent_toolkit_validate',
			description: 'Validate code quality using appropriate linters',
			parameters: {
				files: extractFilesToValidate(content) || ['./src'],
			},
		});
	}

	// arXiv research tool selection
        if (
                keywords.includes('research') ||
                keywords.includes('paper') ||
                keywords.includes('arxiv') ||
                keywords.includes('academic') ||
                keywords.includes('scholar') ||
                keywords.includes('literature') ||
                keywords.includes('citation')
        ) {
                const arxivSearchParameters = createArxivSearchParameters(content);

                if (keywords.includes('search') || keywords.includes('find')) {
                        tools.push({
                                name: 'arxiv_search',
                                description: 'Search for academic papers on arXiv',
                                parameters: arxivSearchParameters,
                        });
                }

                if (
                        keywords.includes('download') ||
                        keywords.includes('pdf') ||
                        keywords.includes('full text')
                ) {
			tools.push({
				name: 'arxiv_download',
				description: 'Download arXiv paper PDF or source',
				parameters: {
					paper_id: extractPaperId(content) || '2301.00001',
					format: extractDownloadFormat(content) || 'pdf',
				},
			});
		}

                // If research is mentioned but no specific action, add search by default
                if (!tools.some((t) => t.name.startsWith('arxiv_'))) {
                        tools.push({
                                name: 'arxiv_search',
                                description: 'Search for academic papers on arXiv',
                                parameters: arxivSearchParameters,
                        });
                }
        }

	// Default to validator if no specific tools identified
	if (tools.length === 0) {
		tools.push({
			name: 'validator',
			description: 'Default validation tool',
			parameters: { input: content },
		});
	}

	return tools;
}

function updateDashboard(
	toolResults: Array<{
		tool: string;
		result: unknown;
		status: 'success' | 'error';
		duration: number;
	}>,
): {
	metrics: Record<string, number>;
	status: string;
	activeTools: number;
} {
	const successCount = toolResults.filter((r) => r.status === 'success').length;
	const totalTools = toolResults.length;
	const avgDuration =
		totalTools > 0 ? toolResults.reduce((sum, r) => sum + r.duration, 0) / totalTools : 0;

	return {
		metrics: {
			successRate: totalTools > 0 ? (successCount / totalTools) * 100 : 0,
			averageDuration: avgDuration,
			totalExecutions: totalTools,
		},
		status: successCount === totalTools ? 'healthy' : 'degraded',
		activeTools: totalTools,
	};
}

function generateToolSummary(
	toolResults: Array<{
		tool: string;
		result: unknown;
		status: 'success' | 'error';
		duration: number;
	}>,
): string {
	const successCount = toolResults.filter((r) => r.status === 'success').length;
	const totalTools = toolResults.length;

	if (totalTools === 0) return 'No tools executed';

	return `Executed ${totalTools} tools, ${successCount} successful`;
}

function generateToolLayerResponse(result: {
	toolsExecuted: number;
	successfulTools: number;
	dashboard: { metrics: Record<string, number>; status: string; activeTools: number };
	summary: string;
}): string {
	return `Tool layer execution complete. ${result.summary}. Dashboard status: ${result.dashboard.status}. Success rate: ${result.dashboard.metrics.successRate?.toFixed(1) || 0}%`;
}

/**
 * Factory function to create Tool Layer Agent
 */
export function createToolLayerAgent(config?: Partial<ToolLayerConfig>): ToolLayerAgent {
	const defaultConfig: ToolLayerConfig = {
		name: 'tool-layer-agent',
		maxConcurrentTools: 5,
		toolTimeout: 30000,
		enableDashboard: true,
		allowedTools: [
			'validator',
			'monitor',
			'dashboard',
			'tool-executor',
			'ui-component',
			'ui-render',
			'ui-interact',
			'create_ui_component',
			'render_view',
			'handle_user_interaction',
			'update_component',
			'get_component_info',
			'list_components',
			// Agent Toolkit tools
			'agent_toolkit_search',
			'agent_toolkit_multi_search',
			'agent_toolkit_codemod',
			'agent_toolkit_validate',
			// arXiv research tools
			'arxiv_search',
			'arxiv_download',
		],
		// AGUI defaults
		enableAGUI: true,
		defaultLayout: 'flex',
		maxUIComponents: 10,
		// Agent Toolkit defaults
		enableAgentToolkit: true,
		codeSearchPaths: ['./src', './packages'],
		validationEnabled: true,
		// arXiv research defaults
		enableArxivResearch: true,
		arxivServerSlug: 'arxiv-1',
		arxivSearchTool: 'search_papers',
		arxivMaxResults: 5,
		...config,
	};

	return new ToolLayerAgent(defaultConfig);
}

// AGUI Helper Functions

/**
 * Extract UI component type from content string
 */
function extractUIComponentType(content: string): string {
	const keywords = content.toLowerCase();

	if (keywords.includes('button')) return 'button';
	if (keywords.includes('form')) return 'form';
	if (keywords.includes('input')) return 'input';
	if (keywords.includes('modal')) return 'modal';
	if (keywords.includes('table')) return 'table';
	if (keywords.includes('chart')) return 'chart';

	return 'button'; // default
}

/**
 * Extract UI label from content string
 */
function extractUILabel(content: string): string | null {
	// Look for quoted strings that might be labels
	const quotedMatch = content.match(/["']([^"']+)["']/);
	if (quotedMatch) return quotedMatch[1];

	// Look for common label patterns
	const labelMatch = content.match(/(?:label|title|text):\s*([\w\s]+)/i);
	if (labelMatch) return labelMatch[1].trim();

	// Extract first meaningful word as potential label
	const words = content
		.split(/\s+/)
		.filter(
			(word) =>
				word.length > 2 &&
				!['the', 'and', 'or', 'but', 'for', 'create', 'make', 'add'].includes(word.toLowerCase()),
		);

	return words[0] || null;
}

/**
 * Extract UI action from content string
 */
function extractUIAction(content: string): string {
	const keywords = content.toLowerCase();

	if (keywords.includes('click')) return 'click';
	if (keywords.includes('hover')) return 'hover';
	if (keywords.includes('focus')) return 'focus';
	if (keywords.includes('input') || keywords.includes('type')) return 'input';
	if (keywords.includes('submit')) return 'submit';
	if (keywords.includes('drag')) return 'drag';
	if (keywords.includes('scroll')) return 'scroll';

	return 'click'; // default
}

// Agent Toolkit Helper Functions

/**
 * Extract search pattern from content string
 */
function extractSearchPattern(content: string): string | null {
	// Look for quoted strings that might be search patterns
	const quotedMatch = content.match(/["']([^"']+)["']/);
	if (quotedMatch) return quotedMatch[1];

	// Look for pattern after 'search for', 'find', etc.
	const patternMatch = content.match(/(?:search\s+for|find|grep)\s+([\w\-.*+?[\]{}()|\\^$]+)/i);
	if (patternMatch) return patternMatch[1];

	// Look for function/class names (capitalized or camelCase)
	const nameMatch = content.match(/\b([A-Z][a-zA-Z0-9]*|[a-z][a-zA-Z0-9]*[A-Z][a-zA-Z0-9]*)\b/);
	if (nameMatch) return nameMatch[1];

	return null;
}

/**
 * Extract search path from content string
 */
function extractSearchPath(content: string): string | null {
	// Look for path patterns
	const pathMatch = content.match(/(?:in|from|at)\s+([./\w-]+)/);
	if (pathMatch) return pathMatch[1];

	// Look for file extensions
	if (content.includes('.ts') || content.includes('typescript')) return './src';
	if (content.includes('.js') || content.includes('javascript')) return './src';
	if (content.includes('.py') || content.includes('python')) return './';
	if (content.includes('package')) return './packages';

	return null;
}

/**
 * Extract find/replace patterns from content string
 */
function extractFindReplacePatterns(content: string): {
	find: string | null;
	replace: string | null;
} {
	// Look for 'replace X with Y' patterns
	const replaceMatch = content.match(
		/replace\s+["']?([^"'\s]+)["']?\s+with\s+["']?([^"'\s]+)["']?/i,
	);
	if (replaceMatch) {
		return { find: replaceMatch[1], replace: replaceMatch[2] };
	}

	// Look for 'change X to Y' patterns
	const changeMatch = content.match(/change\s+["']?([^"'\s]+)["']?\s+to\s+["']?([^"'\s]+)["']?/i);
	if (changeMatch) {
		return { find: changeMatch[1], replace: changeMatch[2] };
	}

	// Look for 'from X to Y' patterns
	const fromToMatch = content.match(/from\s+["']?([^"'\s]+)["']?\s+to\s+["']?([^"'\s]+)["']?/i);
	if (fromToMatch) {
		return { find: fromToMatch[1], replace: fromToMatch[2] };
	}

	return { find: null, replace: null };
}

/**
 * Extract files to validate from content string
 */
function extractFilesToValidate(content: string): string[] | null {
	// Look for file patterns
	const fileMatches = content.match(/\b[\w-/.]+\.(ts|js|py|go|rs|java|cpp|c)\b/gi);
	if (fileMatches) return fileMatches;

	// Look for directory patterns
	const dirMatches = content.match(/\b(?:\.?\/)?(?:src|packages|lib|dist|build)\b/gi);
	if (dirMatches) return dirMatches;

	// Default based on content keywords
	if (content.includes('typescript') || content.includes('.ts')) return ['./src/**/*.ts'];
	if (content.includes('javascript') || content.includes('.js')) return ['./src/**/*.js'];
	if (content.includes('python') || content.includes('.py')) return ['./**/*.py'];

	return null;
}

// arXiv Helper Functions

/**
 * Extract search query from content string
 */
function extractSearchQuery(content: string): string | null {
        // Look for quoted strings that might be search queries
        const quotedMatch = content.match(/["']([^"']+)["']/);
        if (quotedMatch) return quotedMatch[1];

	// Look for 'search for X' patterns
	const searchMatch = content.match(/(?:search\s+(?:for|on)\s+)([\w\s]+)/i);
	if (searchMatch) return searchMatch[1].trim();

	// Look for 'about X' patterns in research context
	const aboutMatch = content.match(/(?:research|paper|literature)\s+(?:about|on)\s+([\w\s]+)/i);
	if (aboutMatch) return aboutMatch[1].trim();

	// Extract key research terms
	const words = content
		.toLowerCase()
		.split(/\s+/)
		.filter(
			(word) =>
				word.length > 3 &&
				![
					'search',
					'find',
					'look',
					'for',
					'about',
					'on',
					'the',
					'and',
					'or',
					'but',
					'in',
					'with',
					'arxiv',
					'paper',
					'research',
				].includes(word),
		);

        return words.slice(0, 5).join(' ') || null;
}

type ArxivSearchField =
        | 'all'
        | 'title'
        | 'author'
        | 'abstract'
        | 'comments'
        | 'journal_ref'
        | 'acm_class'
        | 'msc_class'
        | 'report_num'
        | 'category'
        | 'id';

type ArxivSortOrder = 'relevance' | 'lastUpdatedDate' | 'submittedDate';

interface ArxivSearchParameters {
        query: string;
        max_results: number;
        field?: ArxivSearchField;
        sort_by?: ArxivSortOrder;
}

function createArxivSearchParameters(content: string): ArxivSearchParameters {
        const query = extractSearchQuery(content) || content.trim();
        const maxResults = extractMaxResults(content) || 5;
        const field = extractArxivField(content);
        const sortBy = extractArxivSort(content);

        return {
                query,
                max_results: maxResults,
                ...(field ? { field } : {}),
                ...(sortBy ? { sort_by: sortBy } : {}),
        };
}

/**
 * Extract maximum results from content string
 */
function extractMaxResults(content: string): number | null {
        // Look for number patterns
	const numberMatch = content.match(/(\d+)\s*(?:results?|papers?|articles?)/i);
	if (numberMatch) {
		const num = parseInt(numberMatch[1], 10);
		return Math.min(Math.max(num, 1), 20); // Clamp between 1-20
	}

	// Look for "up to X" patterns
	const upToMatch = content.match(/up\s+to\s+(\d+)/i);
	if (upToMatch) {
		const num = parseInt(upToMatch[1], 10);
		return Math.min(Math.max(num, 1), 20);
	}

        return null;
}

function extractArxivField(content: string): ArxivSearchField | null {
        const normalized = content.toLowerCase();

        const mappings: Array<{ value: ArxivSearchField; patterns: RegExp[] }> = [
                {
                        value: 'title',
                        patterns: [
                                /title[-\s]?only/,
                                /titles?\s+only/,
                                /just\s+the\s+title/,
                                /title\s+(?:search|field|filter)/,
                                /search\s+(?:in\s+)?titles?/,
                        ],
                },
                {
                        value: 'author',
                        patterns: [
                                /author[-\s]?only/,
                                /authors?\s+only/,
                                /by\s+author/,
                                /author\s+(?:field|filter|search)/,
                        ],
                },
                {
                        value: 'abstract',
                        patterns: [
                                /abstract[-\s]?only/,
                                /abstracts?\s+only/,
                                /just\s+the\s+abstract/,
                                /abstract\s+(?:field|filter|search)/,
                                /summary\s+only/,
                        ],
                },
                {
                        value: 'comments',
                        patterns: [/comments?\s+only/, /comment\s+field/, /search\s+comments/],
                },
                {
                        value: 'journal_ref',
                        patterns: [/journal\s+(?:ref|reference)/, /journal[-\s]?only/],
                },
                {
                        value: 'acm_class',
                        patterns: [/acm\s+class/, /acm\s+classification/],
                },
                {
                        value: 'msc_class',
                        patterns: [/msc\s+class/, /mathematics\s+subject\s+classification/],
                },
                {
                        value: 'report_num',
                        patterns: [/report\s+(?:num|number)/, /technical\s+report/],
                },
                {
                        value: 'category',
                        patterns: [
                                /category[-\s]?only/,
                                /subject\s+(?:area|category)/,
                                /primary\s+category/,
                        ],
                },
                {
                        value: 'id',
                        patterns: [/id\s+only/, /identifier[-\s]?only/, /search\s+by\s+id/],
                },
                {
                        value: 'all',
                        patterns: [/all\s+fields?/, /search\s+everything/, /entire\s+(?:record|entry)/],
                },
        ];

        for (const mapping of mappings) {
                if (mapping.patterns.some((pattern) => pattern.test(normalized))) {
                        return mapping.value;
                }
        }

        return null;
}

function extractArxivSort(content: string): ArxivSortOrder | null {
        const normalized = content.toLowerCase();

        const mappings: Array<{ value: ArxivSortOrder; patterns: RegExp[] }> = [
                {
                        value: 'lastUpdatedDate',
                        patterns: [
                                /sort\s+by\s+latest/,
                                /latest\s+(?:papers|results|updates)/,
                                /most\s+recent/,
                                /recently\s+updated/,
                                /last\s+updated/,
                                /newest\s+(?:papers|results)/,
                        ],
                },
                {
                        value: 'submittedDate',
                        patterns: [
                                /sort\s+by\s+submitted/,
                                /submission\s+date/,
                                /chronological\s+order/,
                                /original\s+submission/,
                                /by\s+submission/,
                        ],
                },
                {
                        value: 'relevance',
                        patterns: [
                                /sort\s+by\s+relevance/,
                                /most\s+relevant/,
                                /best\s+match/,
                                /relevance\s+order/,
                        ],
                },
        ];

        for (const mapping of mappings) {
                if (mapping.patterns.some((pattern) => pattern.test(normalized))) {
                        return mapping.value;
                }
        }

        return null;
}

/**
 * Extract arXiv paper ID from content string
 */
function extractPaperId(content: string): string | null {
        // Look for standard arXiv ID patterns (e.g., 2301.00001, math/0309135)
	const arxivIdMatch = content.match(/\b(\d{4}\.\d{4,5}|[a-z-]+\/\d{7})\b/);
	if (arxivIdMatch) return arxivIdMatch[1];

	// Look for "arXiv:" followed by ID
	const arxivPrefixMatch = content.match(/arxiv[:\s]+(\d{4}\.\d{4,5}|[a-z-]+\/\d{7})/i);
	if (arxivPrefixMatch) return arxivPrefixMatch[1];

	return null;
}

/**
 * Extract download format from content string
 */
function extractDownloadFormat(content: string): string | null {
	const keywords = content.toLowerCase();

	if (keywords.includes('pdf')) return 'pdf';
	if (keywords.includes('tex') || keywords.includes('latex')) return 'tex';
	if (keywords.includes('source') || keywords.includes('code')) return 'source';

	return 'pdf'; // default
}
