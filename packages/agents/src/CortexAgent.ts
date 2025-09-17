import { type Memory, VoltAgent } from './mocks/voltagent-core';
import { createLogger } from './mocks/voltagent-logger';
// Import subagent system
import { createSubagentSystem, type SubagentSystemConfig } from './subagents';
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
import { createA2ABridge } from './utils/a2aBridge';
// Import utilities
import { createModelRouter } from './utils/modelRouter';

const logger = createLogger('CortexAgent');

export interface CortexAgentConfig {
	/**
	 * Agent name
	 */
	name?: string;
	/**
	 * Agent instructions
	 */
	instructions?: string;
	/**
	 * Default model to use
	 */
	model?: string;
	/**
	 * Model provider
	 */
	modelProvider?: string;
	/**
	 * Enable memory
	 */
	enableMemory?: boolean;
	/**
	 * Available tools
	 */
	tools?: any[];
	/**
	 * Model router instance
	 */
	modelRouter?: any;
	/**
	 * Cortex-OS specific configuration
	 */
	cortex?: {
		/**
		 * Enable local MLX integration
		 */
		enableMLX?: boolean;
		/**
		 * Ollama base URL
		 */
		ollamaBaseUrl?: string;
		/**
		 * API providers configuration
		 */
		apiProviders?: {
			openai?: {
				apiKey: string;
				baseURL?: string;
			};
			anthropic?: {
				apiKey: string;
				baseURL?: string;
			};
			google?: {
				apiKey: string;
				baseURL?: string;
			};
		};
		/**
		 * Memory configuration
		 */
		memory?: {
			maxWorkingMemory?: number;
			maxContextualMemory?: number;
			retentionDays?: number;
		};
		/**
		 * Subagent system configuration
		 */
		subagents?: {
			/**
			 * Enable subagent system
			 */
			enabled?: boolean;
			/**
			 * Enable delegation between subagents
			 */
			enableDelegation?: boolean;
			/**
			 * Auto-reload on file changes
			 */
			watch?: boolean;
			/**
			 * Custom search paths
			 */
			searchPaths?: string[];
			/**
			 * Delegation configuration
			 */
			delegation?: {
				/**
				 * Default subagent for delegation
				 */
				defaultSubagent?: string;
				/**
				 * Maximum fanout count
				 */
				maxFanout?: number;
				/**
				 * Confidence threshold for auto-delegation
				 */
				confidenceThreshold?: number;
				/**
				 * Enable parallel execution
				 */
				enableParallel?: boolean;
			};
		};
	};
}

export class CortexAgent extends VoltAgent {
	private modelRouter: ReturnType<typeof createModelRouter>;
	private a2aBridge: ReturnType<typeof createA2ABridge>;
	private memory: Memory;
	private subagentSystem?: any; // SubagentSystem
	// private delegationRouter?: DelegationRouter; // Unused for now

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
			model: config.model || 'gpt-4',
		});

		// Initialize components
		this.memory = {
			id: 'mock',
			content: 'mock memory',
			type: 'working',
			tags: [],
			importance: 5,
			timestamp: new Date().toISOString(),
		};
		this.modelRouter = config.modelRouter || createModelRouter(config.cortex);
		this.a2aBridge = createA2ABridge();

		// Initialize tools
		this.initializeTools();

		// Initialize subagent system if enabled
		if (config.cortex?.subagents?.enabled) {
			this.initializeSubagents(config);
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
		this.addTool(createMemoryStoreTool(this.memory));
		this.addTool(createMemoryRetrieveTool());
		this.addTool(createMemorySearchTool());
		this.addTool(createMemoryUpdateTool());
		this.addTool(createMemoryDeleteTool());

		logger.info(`Initialized ${this.list().length} tools`);
	}

	/**
	 * Execute the agent with improved model routing
	 */
	async execute(
		input: string,
		options?: {
			stream?: boolean;
			modelOverride?: string;
			temperature?: number;
			maxTokens?: number;
			securityCheck?: boolean;
		},
	): Promise<any> {
		// Perform security check on input if enabled
		if (options?.securityCheck !== false) {
			const securityTool = Array.from(this.tools.values()).find((t) => t.name === 'security_guard');
			if (securityTool) {
				const inputCheck = await securityTool.execute(
					{
						content: input,
						checkType: 'input',
						strictness: 'medium',
					},
					{},
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

		// Mock execution
		const response: any = {
			success: true,
			model,
			input,
			response: `Mock response for: ${input}`,
			timestamp: new Date().toISOString(),
		};

		// Perform security check on output if enabled
		if (options?.securityCheck !== false) {
			const securityTool = Array.from(this.tools.values()).find((t) => t.name === 'security_guard');
			if (securityTool) {
				const outputCheck = await securityTool.execute(
					{
						content: response.response,
						checkType: 'output',
						strictness: 'medium',
					},
					{},
				);

				if (!outputCheck.isSafe) {
					logger.warn('Security warning for output:', outputCheck.violations);
					response.securityWarning = {
						riskLevel: outputCheck.riskLevel,
						violations: outputCheck.violations,
						recommendations: outputCheck.recommendations,
					};
				}
			}
		}

		return response;
	}

	/**
	 * Initialize subagent system
	 */
	private async initializeSubagents(config: CortexAgentConfig): Promise<void> {
		logger.info('Initializing subagent system...');

		const subagentConfig: SubagentSystemConfig = {
			toolRegistry: this as any, // IToolRegistry
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
			// TODO: Initialize delegation router when DelegationRouter is properly defined
			// this.delegationRouter = new DelegationRouter(
			//	this.subagentSystem.getRegistry(),
			//	config.cortex.subagents.delegation
			// );
		}

		logger.info(`Subagent system initialized with ${this.subagentSystem.getToolNames().length} subagents`);
	}

	/**
	 * Set delegator for subagent delegation
	 */
	setDelegator(_delegator: unknown): void {
		// Delegator functionality not implemented yet
	}	/**
	 * Get agent status and health
	 */
	async getStatus(): Promise<{
		status: 'healthy' | 'degraded' | 'unhealthy';
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
			model: model.name,
			tools: this.list().map((t) => t.name),
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
