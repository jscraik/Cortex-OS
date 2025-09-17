import { type Memory, type Tool, VoltAgent } from './mocks/voltagent-core';
import { createLogger } from './mocks/voltagent-logger';
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
	};
}

export class CortexAgent extends VoltAgent {
	private modelRouter: ReturnType<typeof createModelRouter>;
	private a2aBridge: ReturnType<typeof createA2ABridge>;
	private memory: Memory;
	private tools: Tool[] = [];

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

Always:
1. Use appropriate tools for tasks
2. Maintain clear communication
3. Store important information in memory
4. Follow Cortex-OS architecture principles`,
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
		this.modelRouter = createModelRouter(config.cortex);
		this.a2aBridge = createA2ABridge();

		// Initialize tools
		this.initializeTools();
	}

	private initializeTools(): void {
		this.tools = [
			// System tools
			CortexHealthCheckTool,
			PackageManagerTool,
			FileOperationTool,
			createModelRouterTool(this.modelRouter),
			createSecurityGuardTool(),

			// A2A communication tools
			createA2ASendEventTool(this.a2aBridge),
			createA2AReceiveEventTool(this.a2aBridge),

			// MCP integration tools
			MCPListServersTool,
			MCPCallToolTool,
			MCPServerInfoTool,

			// Memory management tools
			createMemoryStoreTool(this.memory),
			createMemoryRetrieveTool(),
			createMemorySearchTool(),
			createMemoryUpdateTool(),
			createMemoryDeleteTool(),
		];

		// Tools are automatically registered with the agent
		logger.info(`Initialized ${this.tools.length} tools`);
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
			const securityTool = this.tools.find(t => t.name === 'security_guard');
			if (securityTool) {
				const inputCheck = await securityTool.execute({
					content: input,
					checkType: 'input',
					strictness: 'medium',
				}, {});

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
			(await this.modelRouter.selectModel(input, this.tools));

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
			const securityTool = this.tools.find(t => t.name === 'security_guard');
			if (securityTool) {
				const outputCheck = await securityTool.execute({
					content: response.response,
					checkType: 'output',
					strictness: 'medium',
				}, {});

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
	 * Get agent status and health
	 */
	async getStatus(): Promise<{
		status: 'healthy' | 'degraded' | 'unhealthy';
		model: string;
		tools: string[];
		memoryStats?: {
			totalMemories: number;
			workingMemory: number;
			contextualMemory: number;
		};
	}> {
		const model = await this.modelRouter.getCurrentModel();

		return {
			status: 'healthy',
			model: model.name,
			tools: this.tools.map((t) => t.name),
			// Memory stats would need to be implemented based on actual memory usage
		};
	}
}
