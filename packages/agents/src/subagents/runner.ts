/**
 * Subagent execution runner with isolation
 *
 * This module provides the execution environment for subagents with proper
 * isolation, context management, and delegation support.
 */

import { v4 as uuidv4 } from 'uuid';
import { CortexAgent } from '../CortexAgent';
import { createLogger } from '../mocks/voltagent-logger';
import { createModelRouter } from '../utils/modelRouter';
import type {
	DelegationRequest,
	DelegationResult,
	ISubagentRunner,
	SubagentContext,
	SubagentResult,
	ToolAccessControl,
} from './types';

const logger = createLogger('SubagentRunner');

/**
 * Tool access control implementation
 */
class SubagentToolAccessControl implements ToolAccessControl {
	constructor(
		private allowed: string[],
		private blocked: string[],
	) {}

	allow: string[] = this.allowed;
	block: string[] = this.blocked;

	isAccessible(toolName: string): boolean {
		// Check block list first
		if (this.blocked.some((pattern) => this.matchPattern(toolName, pattern))) {
			return false;
		}

		// If allow list is empty, allow all (except blocked)
		if (this.allowed.length === 0) {
			return true;
		}

		// Check allow list
		return this.allowed.some((pattern) => this.matchPattern(toolName, pattern));
	}

	private matchPattern(name: string, pattern: string): boolean {
		// Simple glob-style matching
		if (pattern === '*') return true;
		if (pattern.endsWith('*')) {
			return name.startsWith(pattern.slice(0, -1));
		}
		if (pattern.startsWith('*')) {
			return name.endsWith(pattern.slice(1));
		}
		return name === pattern;
	}
}

/**
 * Main subagent runner implementation
 */
export class SubagentRunner implements ISubagentRunner {
	private delegator?: ISubagentDelegator;

	constructor(delegator?: ISubagentDelegator) {
		this.delegator = delegator;
	}

	/**
	 * Execute a subagent with the given context
	 */
	async execute(context: SubagentContext): Promise<SubagentResult> {
		const startTime = Date.now();
		logger.info(`Executing subagent: ${context.config.name} (${context.id})`);

		try {
			// Create tool access control
			const accessControl = new SubagentToolAccessControl(
				context.config.allowed_tools || [],
				context.config.blocked_tools || [],
			);

			// Filter tools based on access control
			const filteredTools = context.tools.filter((tool) =>
				accessControl.isAccessible(tool.name),
			);

			// Create model router with subagent's model preferences
			const modelRouter = createModelRouter({
				enableMLX:
					context.config.model_provider === 'mlx' ||
					!context.config.model_provider,
				ollamaBaseUrl:
					context.config.model_provider === 'ollama'
						? (context.config.model_config?.ollamaBaseUrl as string)
						: undefined,
				apiProviders: this.buildApiProvidersConfig(context.config),
			});

			// Create a temporary CortexAgent instance for this subagent
			const agent = new CortexAgent({
				name: context.config.name,
				description: context.config.description,
				model: context.config.model,
				modelProvider: context.config.model_provider,
				enableMemory: context.config.memory_enabled,
				tools: filteredTools,
				modelRouter,
			});

			// Set up delegation if enabled
			if (this.delegator && context.config.auto_delegate) {
				agent.setDelegator(this.delegator);
			}

			// Execute the agent
			const result = await agent.execute({
				message: context.input,
				context: {
					isolationId: context.config.context_isolation
						? context.id
						: undefined,
					recursionDepth: context.metadata.recursionDepth,
					maxRecursion: context.config.max_recursion,
					scope: context.config.scope,
				},
				options: {
					timeout: context.config.timeout_ms,
					maxTokens: context.config.max_tokens,
				},
			});

			const duration = Date.now() - startTime;

			return {
				success: true,
				output: result.content,
				toolCalls: result.toolCalls,
				metrics: {
					duration,
					tokensUsed: result.tokenUsage?.total,
					toolCalls: result.toolCalls?.length || 0,
				},
			};
		} catch (error) {
			const duration = Date.now() - startTime;
			logger.error(`Subagent execution failed: ${context.config.name}`, error);

			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
				metrics: {
					duration,
					toolCalls: 0,
				},
			};
		}
	}

	/**
	 * Check if the subagent is healthy
	 */
	async healthCheck(): Promise<boolean> {
		try {
			// Simple health check - could be extended to check model availability
			return true;
		} catch (error) {
			logger.error('Health check failed:', error);
			return false;
		}
	}

	/**
	 * Get subagent capabilities
	 */
	async getCapabilities(): Promise<string[]> {
		return ['text-generation', 'tool-use', 'memory-access', 'delegation'];
	}

	/**
	 * Build API providers configuration from subagent config
	 */
	private buildApiProvidersConfig(config: any) {
		const providers: any = {};

		if (config.model_provider === 'openai' && config.model_config?.apiKey) {
			providers.openai = {
				apiKey: config.model_config.apiKey,
				baseURL: config.model_config.baseURL,
			};
		} else if (
			config.model_provider === 'anthropic' &&
			config.model_config?.apiKey
		) {
			providers.anthropic = {
				apiKey: config.model_config.apiKey,
				baseURL: config.model_config.baseURL,
			};
		} else if (
			config.model_provider === 'google' &&
			config.model_config?.apiKey
		) {
			providers.google = {
				apiKey: config.model_config.apiKey,
				baseURL: config.model_config.baseURL,
			};
		}

		return providers;
	}
}

/**
 * Subagent delegator interface
 */
export interface ISubagentDelegator {
	delegate(request: DelegationRequest): Promise<DelegationResult>;
}

/**
 * Default delegator implementation
 */
export class DefaultSubagentDelegator implements ISubagentDelegator {
	constructor(private runners: Map<string, SubagentRunner>) {}

	async delegate(request: DelegationRequest): Promise<DelegationResult> {
		const startTime = Date.now();
		logger.info(`Delegating to: ${request.to}`);

		const runner = this.runners.get(request.to);
		if (!runner) {
			return {
				success: false,
				error: `Subagent not found: ${request.to}`,
				metrics: {
					duration: Date.now() - startTime,
					agent: request.to,
				},
			};
		}

		// Get the subagent config
		// This is a simplified version - in practice, you'd need to access the registry
		const config = {
			name: request.to,
			description: `Delegated subagent: ${request.to}`,
			scope: 'project' as const,
			auto_delegate: false, // Prevent further delegation
			max_recursion: 0, // No recursion for delegated calls
			timeout_ms: request.metadata?.timeout || 30000,
			context_isolation: true,
			memory_enabled: true,
		};

		const context: SubagentContext = {
			id: uuidv4(),
			config,
			input: request.message,
			tools: [], // Tools would be populated from the registry
			metadata: {
				startTime,
				parentId: 'delegated',
				recursionDepth: 0,
				delegated: true,
			},
		};

		const result = await runner.execute(context);

		return {
			success: result.success,
			response: result.output,
			error: result.error,
			metrics: {
				duration: Date.now() - startTime,
				agent: request.to,
			},
		};
	}
}
