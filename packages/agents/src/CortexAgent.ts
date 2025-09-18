import { createPinoLogger } from '@voltagent/logger';
import {
	AuthenticationError,
	NetworkError,
	ProviderError,
	ValidationError,
	wrapUnknownError,
} from './errors';
import { Agent, type Tool, type ToolSchema } from './mocks/voltagent-core.js';
// Import subagent system
import { createSubagentSystem, type SubagentSystemConfig } from './subagents';
import {
	DelegationRouter,
	type RouterConfig,
	type RoutingRule,
} from './subagents/router';
import type { ISubagentRegistry } from './subagents/types';
import { createA2AReceiveEventTool } from './tools/A2AReceiveEventTool';
import { createA2ASendEventTool } from './tools/A2ASendEventTool';
// Import tools
import { CortexHealthCheckTool } from './tools/CortexHealthCheckTool';
import { FileOperationTool } from './tools/FileOperationTool';
import { MCPCallToolTool } from './tools/MCPCallToolTool';
import { MCPListServersTool } from './tools/MCPListServersTool';
import { MCPServerInfoTool } from './tools/MCPServerInfoTool';
import { createMemoryDeleteTool } from './tools/MemoryDeleteTool';
import { createMemoryRetrieveTool } from './tools/MemoryRetrieveTool';
import { createMemorySearchTool } from './tools/MemorySearchTool';
import { createMemoryStoreTool } from './tools/MemoryStoreTool';
import { createMemoryUpdateTool } from './tools/MemoryUpdateTool';
import { createModelRouterTool } from './tools/ModelRouterTool';
import { PackageManagerTool } from './tools/PackageManagerTool';
import { createSecurityGuardTool } from './tools/SecurityGuardTool';
import type { IToolRegistry } from './types';
import { createA2ABridge } from './utils/a2aBridge';
// Import utilities
import { createModelRouter } from './utils/modelRouter';
import { buildPromptInstructions } from './utils/promptPolicy';

const logger = createPinoLogger({ name: 'CortexAgent' });

export interface CortexSubagentsDelegationConfig {
	defaultSubagent?: string;
	maxFanout?: number;
	confidenceThreshold?: number;
	enableParallel?: boolean;
	rules?: RoutingRule[];
}

export interface CortexSubagentsConfig {
	enabled?: boolean;
	searchPaths?: string[];
	watch?: boolean;
	enableDelegation?: boolean;
	delegation?: CortexSubagentsDelegationConfig;
}

export interface CortexAgentConfig {
	name?: string;
	instructions?: string;
	model?: string;
	modelProvider?: string;
	enableMemory?: boolean;
	tools?: Tool[];
	modelRouter?: ReturnType<typeof createModelRouter>;
	cortex?: {
		enableMLX?: boolean;
		ollamaBaseUrl?: string;
		apiProviders?: {
			openai?: { apiKey: string; baseURL?: string };
			anthropic?: { apiKey: string; baseURL?: string };
		};
		subagents?: CortexSubagentsConfig;
	};
}

export class CortexAgent extends Agent {
	private readonly subagentToolMap = new Map<string, Tool<ToolSchema>>();
	private readonly toolRegistryAdapter: IToolRegistry;
	private readonly modelRouter: ReturnType<typeof createModelRouter>;
	private readonly a2aBridge: ReturnType<typeof createA2ABridge>;
	private subagentSystem?: {
		getToolNames(): string[];
		getRegistry(): ISubagentRegistry;
	}; // SubagentSystem
	private delegationRouter?: DelegationRouter;

	constructor(config: CortexAgentConfig) {
		const defaultInstructions = buildPromptInstructions({
			blocks: {
				task: 'You are a Cortex-OS agent, part of an autonomous software behavior reasoning system.',
				tone: 'Professional, concise, actionable.',
				background:
					'Your capabilities include:\n- Analyzing code and generating tests\n- Creating and updating documentation\n- Performing security analysis\n- Orchestrating complex workflows\n- Communicating with other agents via A2A\n- Accessing MCP tools and services\n- Managing contextual memory\n- Delegating to specialized subagents when appropriate',
				rules: [
					'Use appropriate tools for tasks',
					'Maintain clear communication',
					'Store important information in memory',
					'Follow Cortex-OS architecture principles',
					'Consider delegating to specialized subagents for complex tasks',
				],
				request: 'Address the user request accurately and efficiently.',
				deliberation: 'reasoning_effort=medium',
				output:
					'Respond using clear Markdown. Include steps, tool calls (if any), and concise results.',
			},
		});

		super({
			name: config.name || 'CortexAgent',
			instructions: config.instructions || defaultInstructions,
			model: config.model || 'gpt-4o-mini',
		});

		this.modelRouter = config.modelRouter || createModelRouter(config.cortex);
		this.a2aBridge = createA2ABridge();

		// Initialize tools
		this.initializeTools();

		// Initialize tool registry adapter for subagent system
		this.toolRegistryAdapter = {
			register: <T extends ToolSchema>(tool: Tool<T>) => {
				const t = tool as unknown as Tool<ToolSchema>;
				this.addTools([t]);
				const id = (t as unknown as { id?: string }).id || t.name;
				this.subagentToolMap.set(id, t);
			},
			unregister: (toolId: string) => {
				return this.subagentToolMap.delete(toolId);
			},
			get: <T extends ToolSchema>(toolId: string) => {
				const tool = this.subagentToolMap.get(toolId);
				return tool ? (tool as unknown as Tool<T>) : null;
			},
			list: <T extends ToolSchema>() =>
				Array.from(this.subagentToolMap.values()) as unknown as Tool<T>[],
			has: (toolId: string) => this.subagentToolMap.has(toolId),
		} satisfies IToolRegistry;

		// Subagent system is initialized via explicit init() to avoid async-in-constructor
	}

	// Use base Agent's registry APIs for tests and programmatic control

	// Public registry helpers (avoid name collision with base Agent methods)
	regRegister(tool: Tool<ToolSchema>): void {
		this.toolRegistryAdapter.register(tool);
	}

	regUnregister(toolId: string): boolean {
		return this.toolRegistryAdapter.unregister(toolId);
	}

	regGet(toolId: string): Tool<ToolSchema> | null {
		return this.toolRegistryAdapter.get(toolId);
	}

	regList(): Tool<ToolSchema>[] {
		return this.toolRegistryAdapter.list();
	}

	regHas(toolId: string): boolean {
		return this.toolRegistryAdapter.has(toolId);
	}

	/** Initialize subsystems that require async setup (subagents, delegation) */
	async init(config: CortexAgentConfig): Promise<void> {
		if (config.cortex?.subagents?.enabled) {
			await this.initializeSubagents(config);
		}
	}

	private initializeTools(): void {
		// Add system tools
		this.addTools([
			CortexHealthCheckTool,
			PackageManagerTool,
			FileOperationTool,
			createModelRouterTool(this.modelRouter),
			createSecurityGuardTool(),
			// A2A
			createA2ASendEventTool(this.a2aBridge),
			createA2AReceiveEventTool(this.a2aBridge),
			// MCP
			MCPListServersTool,
			MCPCallToolTool,
			MCPServerInfoTool,
			// Memory
			createMemoryStoreTool({}),
			createMemoryRetrieveTool(),
			createMemorySearchTool(),
			createMemoryUpdateTool(),
			createMemoryDeleteTool(),
		]);

		logger.info(`Initialized ${this.getTools().length} tools`);
	}

	// addTool wrapper removed; use addTools directly

	/**
	 * Execute the agent with improved model routing
	 */
	// eslint-disable-next-line sonarjs/cognitive-complexity
	async generateTextEnhanced(
		input: string,
		options?: {
			modelOverride?: string;
			temperature?: number;
			maxTokens?: number;
			securityCheck?: boolean;
		},
	): Promise<unknown> {
		// Perform security check on input if enabled
		if (options?.securityCheck !== false) {
			const securityTool = this.getTools().find(
				(t) => t.name === 'security_guard',
			);
			if (securityTool) {
				const inputCheck = await securityTool.execute(
					{
						content: input,
						checkType: 'input',
						strictness: 'medium',
					},
					undefined,
				);

				if (!inputCheck.isSafe && inputCheck.riskLevel === 'critical') {
					return {
						success: false,
						error: 'Security violation detected in input',
						violations: inputCheck.violations,
						recommendations: inputCheck.recommendations,
					};
				}

				if (inputCheck.riskLevel === 'high') {
					logger.warn('Security warning for input:', inputCheck.violations);
				}
			}
		}

		// Determine best model
		const model =
			options?.modelOverride ||
			(await this.modelRouter.selectModel(input, this.getTools()));

		logger.info(`Executing with model: ${model}`);

		// Try to use fallback chain provider first
		let response;
		try {
			const content = await this.modelRouter.generateText(input, {
				temperature: options?.temperature,
				maxTokens: options?.maxTokens,
			});
			response = { text: content };
		} catch (error) {
			const agentError = wrapUnknownError(error);

			if (
				agentError instanceof NetworkError ||
				agentError instanceof ProviderError
			) {
				logger.warn(
					'Fallback provider failed, falling back to VoltAgent:',
					agentError,
				);

				// Fallback to base implementation
				response = await this.generateText(input, {
					temperature: options?.temperature,
					maxTokens: options?.maxTokens,
				});
			} else if (agentError instanceof AuthenticationError) {
				logger.error(
					'Authentication failed with fallback provider:',
					agentError,
				);
				throw new ValidationError('Authentication required for model access');
			} else {
				logger.error('Unexpected error with fallback provider:', agentError);
				throw agentError;
			}
		}

		// Perform security check on output if enabled
		if (options?.securityCheck !== false) {
			const securityTool = this.getTools().find(
				(t) => t.name === 'security_guard',
			);
			if (securityTool) {
				const outputCheck = await securityTool.execute(
					{
						content: response.text,
						checkType: 'output',
						strictness: 'medium',
					},
					undefined,
				);

				if (!outputCheck.isSafe) {
					logger.warn('Security warning for output:', outputCheck.violations);
					return {
						...response,
						securityWarning: {
							riskLevel: outputCheck.riskLevel,
							violations: outputCheck.violations,
							recommendations: outputCheck.recommendations,
						},
					} as unknown as typeof response;
				}
			}
		}

		return response;
	}

	// Keep base generateText signature from Agent; enhanced version available via generateTextEnhanced

	/**
	 * Initialize subagent system
	 */
	private async initializeSubagents(config: CortexAgentConfig): Promise<void> {
		logger.info('Initializing subagent system...');

		const subagentConfig: SubagentSystemConfig = {
			toolRegistry: this.toolRegistryAdapter, // IToolRegistry
			globalTools: this.getTools(),
			loader: {
				searchPaths: config.cortex?.subagents?.searchPaths,
			},
			enableDelegation: config.cortex?.subagents?.enableDelegation ?? true,
			watch: config.cortex?.subagents?.watch ?? false,
		};

		// Create subagent system
		this.subagentSystem = await createSubagentSystem(subagentConfig);

		// Initialize delegation router if enabled
		if (config.cortex?.subagents?.delegation) {
			const d = config.cortex.subagents.delegation;
			const routerConfig: RouterConfig = {
				defaultSubagent: d.defaultSubagent,
				maxFanout: d.maxFanout,
				confidenceThreshold: d.confidenceThreshold,
				enableParallel: d.enableParallel,
				rules: d.rules ?? [],
			};
			this.delegationRouter = new DelegationRouter(
				this.subagentSystem.getRegistry(),
				routerConfig,
			);
		}

		logger.info(
			`Subagent system initialized with ${this.subagentSystem.getToolNames().length} subagents`,
		);
	}

	/**
	 * Set delegator for subagent delegation (not implemented)
	 */
	// Reserved for future custom delegator wiring
	setDelegator(_delegator: unknown): void {
		// Delegator functionality not implemented yet
	}

	/**
	 * Get the delegation router if configured
	 */
	getDelegationRouter(): DelegationRouter | undefined {
		return this.delegationRouter;
	}

	/**
	 * Use the DelegationRouter to choose subagents and optionally execute via materialized tools
	 */
	async delegateToSubagents(
		message: string,
		execute = true,
	): Promise<Array<{ to: string; result?: unknown }>> {
		if (!this.delegationRouter || !this.subagentSystem) return [];

		const { candidates, strategy, shouldDelegate } =
			await this.delegationRouter.route(message);
		if (!shouldDelegate || candidates.length === 0) return [];

		const requests = await this.delegationRouter.createDelegations(
			message,
			strategy,
			candidates,
		);

		if (!execute) {
			return requests.map((r) => ({ to: r.to }));
		}

		// Execute via materialized tools (agent.<name>)
		const toolMap = new Map(this.getTools().map((t) => [t.name, t]));
		if (strategy === 'single') {
			const to = requests[0].to;
			const tool = toolMap.get(`agent.${to}`);
			if (!tool) return [];
			const result = await tool.execute({ message });
			return [{ to, result }];
		}

		// fanout
		const results: Array<{ to: string; result?: unknown }> = [];
		for (const r of requests) {
			const tool = toolMap.get(`agent.${r.to}`);
			if (!tool) continue;
			const result = await tool.execute({ message });
			results.push({ to: r.to, result });
		}
		return results;
	}

	/**
	 * Get health status of the agent
	 */
	async getHealthStatus(): Promise<{
		status: string;
		model: string;
		tools: string[];
		subagents?: {
			enabled: boolean;
			count: number;
			tools: string[];
		};
		memoryStats?: {
			totalMemories: number;
			workingMemory: number;
			contextualMemory: number;
		};
	}> {
		const model = await this.modelRouter.getCurrentModel();

		const status = {
			status: 'healthy' as const,
			model: model?.name ?? 'unknown',
			tools: this.getTools().map((t) => t.name),
		};

		// Add subagent info if enabled
		if (this.subagentSystem) {
			return {
				...status,
				subagents: {
					enabled: true,
					count: this.subagentSystem.getToolNames().length,
					tools: this.subagentSystem.getToolNames(),
				},
			};
		}

		return status;
	}

	// Alias for tests/back-compat
	async getStatus() {
		return this.getHealthStatus();
	}

	// Implement abstract methods from Agent
	async run(input: any): Promise<any> {
		// Default implementation
		return await this.generateText(input);
	}

	async generateText(input: string, options?: any): Promise<any> {
		try {
			return await this.modelRouter.generateText(input, options);
		} catch (error) {
			throw wrapUnknownError(error);
		}
	}

	private tools: Tool<any>[] = [];

	addTools(tools: Tool<any>[]): void {
		this.tools.push(...tools);
	}

	getTools(): Tool<any>[] {
		return [...this.tools];
	}
}
