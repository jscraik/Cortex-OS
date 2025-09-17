import { Agent, type Tool } from '@voltagent/core';
import { createPinoLogger } from '@voltagent/logger';
import type { ZodTypeAny } from 'zod';
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

export class CortexAgent extends Agent implements IToolRegistry {
	private readonly toolMap = new Map<string, Tool<ZodTypeAny>>();
	private readonly modelRouter: ReturnType<typeof createModelRouter>;
	private readonly a2aBridge: ReturnType<typeof createA2ABridge>;
	private subagentSystem?: {
		getToolNames(): string[];
		getRegistry(): ISubagentRegistry;
	}; // SubagentSystem
	private delegationRouter?: DelegationRouter;

	constructor(config: CortexAgentConfig) {
		super({
			name: config.name || 'CortexAgent',
			instructions:
				config.instructions ||
				`You are a Cortex-OS agent, part of an autonomous software behavior reasoning system.

Your capabilities include:
- Analyzing code and generating tests
- Creating and updating documentation
- Performing security analysis
- Orchestrating complex workflows
- Communicating with other agents via A2A
- Accessing MCP tools and services
- Managing contextual memory
- Delegating to specialized subagents when appropriate

Always:
1. Use appropriate tools for tasks
2. Maintain clear communication
3. Store important information in memory
4. Follow Cortex-OS architecture principles
5. Consider delegating to specialized subagents for complex tasks`,
			model: config.model || 'gpt-4o-mini',
		});

		this.modelRouter = config.modelRouter || createModelRouter(config.cortex);
		this.a2aBridge = createA2ABridge();

		// Initialize tools
		this.initializeTools();

		// Subagent system is initialized via explicit init() to avoid async-in-constructor
	}

	/** Initialize subsystems that require async setup (subagents, delegation) */
	async init(config: CortexAgentConfig): Promise<void> {
		if (config.cortex?.subagents?.enabled) {
			await this.initializeSubagents(config);
		}
	}

	private initializeTools(): void {
		// Add system tools
		this.addTool(CortexHealthCheckTool);
		this.addTool(PackageManagerTool);
		this.addTool(FileOperationTool);
		this.addTool(createModelRouterTool(this.modelRouter));
		this.addTool(createSecurityGuardTool());

		// Add A2A communication tools
		this.addTool(createA2ASendEventTool(this.a2aBridge));
		this.addTool(createA2AReceiveEventTool(this.a2aBridge));

		// Add MCP integration tools
		this.addTool(MCPListServersTool);
		this.addTool(MCPCallToolTool);
		this.addTool(MCPServerInfoTool);

		// Add memory management tools
		this.addTool(createMemoryStoreTool({}));
		this.addTool(createMemoryRetrieveTool());
		this.addTool(createMemorySearchTool());
		this.addTool(createMemoryUpdateTool());
		this.addTool(createMemoryDeleteTool());

		logger.info(`Initialized ${this.list().length} tools`);
	}

	private addTool(tool: Tool<ZodTypeAny>): void {
		this.register(tool);
	}

	/**
	 * Execute the agent with improved model routing
	 */
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
			(await this.modelRouter.selectModel(input, this.list()));

		logger.info(`Executing with model: ${model}`);

		// Delegate to VoltAgent Agent for real LLM execution
		const response = await super.generateText(input, {
			temperature: options?.temperature,
			maxOutputTokens: options?.maxTokens,
		});

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

	// Provide a simple wrapper with original name for callers in this package
	async generateText(input: any, options?: any): Promise<any> {
		return this.generateTextEnhanced(input, options);
	}

	/**
	 * Initialize subagent system
	 */
	private async initializeSubagents(config: CortexAgentConfig): Promise<void> {
		logger.info('Initializing subagent system...');

		const subagentConfig: SubagentSystemConfig = {
			toolRegistry: this, // IToolRegistry
			globalTools: this.list(),
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

	// IToolRegistry implementation to support subagent tool registration
	register(tool: Tool<ZodTypeAny>): void {
		this.addTools([tool]);
		// Prefer explicit id if available, else name
		const id = (tool as unknown as { id?: string }).id ?? tool.name;
		this.toolMap.set(id, tool);
	}
	unregister(toolId: string): boolean {
		// Agent does not expose single-tool removal by id/name directly; keep local map only
		const existed = this.toolMap.delete(toolId);
		return existed;
	}
	get(toolId: string): unknown {
		return this.toolMap.get(toolId) ?? (null as unknown);
	}
	list(): unknown[] {
		return this.getTools() as unknown[];
	}
	has(toolId: string): boolean {
		return (
			this.toolMap.has(toolId) ||
			this.getTools().some(
				(t: Tool<ZodTypeAny>) =>
					(t as unknown as { id?: string }).id === toolId || t.name === toolId,
			)
		);
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
			tools: this.list().map((t: Tool<ToolSchema>) => t.name),
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
}
