/**
 * Subagent tool materialization
 *
 * This module creates executable tools from subagent configurations,
 * exposing them as `agent.{name}` tools in the main agent.
 */

import { createPinoLogger } from '@voltagent/logger';
import { z } from 'zod';
import type { IToolRegistry } from '../types';
import {
	createTool,
	type Tool,
	type ToolSchema,
} from './mocks/voltagent-core.js';
import { type ISubagentDelegator, SubagentRunner } from './runner';
import type { SubagentConfig, SubagentTool } from './types';

const logger = createPinoLogger({ name: 'SubagentTools' });

export class SubagentToolFactory {
	public readonly runners = new Map<string, SubagentRunner>();
	private delegator?: ISubagentDelegator;
	private readonly recursionDepth = new Map<string, number>();

	constructor(
		private readonly toolRegistry: IToolRegistry,
		private readonly globalTools: Tool<ToolSchema>[],
	) {}

	/**
	 * Create a tool from a subagent configuration
	 */
	createTool(config: SubagentConfig): SubagentTool {
		// Create runner for this subagent
		const runner = new SubagentRunner(this.delegator);
		this.runners.set(config.name, runner);

		// Reset recursion depth for new subagent
		this.recursionDepth.set(config.name, 0);

		const tool = createTool({
			id: `agent.${config.name}`,
			name: `agent.${config.name}`,
			description: `${config.description} (Model: ${config.model || 'default'})`,
			parameters: z.object({
				message: z.string().describe('Message or task for the subagent'),
				context: z
					.string()
					.optional()
					.describe('Optional context or background information'),
			}),
			execute: async (params) => {
				const depth = this.recursionDepth.get(config.name) || 0;

				// Check recursion limit
				if (depth >= (config.max_recursion || 3)) {
					throw new Error(
						`Maximum recursion depth (${config.max_recursion}) exceeded for subagent: ${config.name}`,
					);
				}

				// Update recursion depth
				this.recursionDepth.set(config.name, depth + 1);

				try {
					// Filter global tools based on subagent's access control
					const availableTools = this.filterTools(this.globalTools, config);

					const context = {
						id: `subagent-${config.name}-${Date.now()}`,
						config,
						input: params.message,
						tools: availableTools,
						metadata: {
							startTime: Date.now(),
							recursionDepth: depth,
							delegated: false,
						},
					};

					const result = await runner.execute(context);

					// Reset recursion depth on successful completion
					this.recursionDepth.set(config.name, 0);

					if (!result.success) {
						throw new Error(`Subagent execution failed: ${result.error}`);
					}

					return {
						content: result.output,
						tool_calls: result.toolCalls,
						metrics: result.metrics,
					};
				} catch (error) {
					// Reset recursion depth on error
					this.recursionDepth.set(config.name, 0);
					throw error;
				}
			},
		});

		// Register the tool
		this.toolRegistry.register(tool);

		logger.info(`Created subagent tool: ${tool.name}`);
		return tool as unknown as SubagentTool;
	}

	/**
	 * Remove a subagent tool
	 */
	removeTool(name: string): boolean {
		const toolId = `agent.${name}`;
		const removed = this.toolRegistry.unregister(toolId);

		if (removed) {
			this.runners.delete(name);
			this.recursionDepth.delete(name);
			logger.info(`Removed subagent tool: ${toolId}`);
		}

		return removed;
	}

	/**
	 * Set up delegation between subagents
	 */
	enableDelegation(): void {
		this.delegator = {
			delegate: async (request) => {
				const targetRunner = this.runners.get(request.to);
				if (!targetRunner) {
					throw new Error(`Target subagent not found: ${request.to}`);
				}

				// Get target subagent config (simplified)
				const config = {
					name: request.to,
					version: '1.0.0',
					description: `Delegated subagent: ${request.to}`,
					scope: 'project' as const,
					parallel_fanout: false,
					auto_delegate: false,
					max_recursion: 0,
					context_isolation: true,
					memory_enabled: false,
					allow_network: false,
					sandbox: true,
					timeout_ms: 30000,
					tags: [],
				};

				const context = {
					id: `delegate-${Date.now()}`,
					config,
					input: request.message,
					tools: this.filterTools(this.globalTools, config),
					metadata: {
						startTime: Date.now(),
						recursionDepth: 0,
						delegated: true,
					},
				};

				const result = await targetRunner.execute(context);

				return {
					success: result.success,
					response: result.output,
					error: result.error,
					metrics: {
						duration: result.metrics.duration,
						agent: request.to,
					},
				};
			},
		};

		// Update all runners with the delegator
		for (const runner of this.runners.values()) {
			runner.delegator = this.delegator;
		}

		logger.info('Enabled subagent delegation');
	}

	/**
	 * Filter tools based on subagent configuration
	 */
	private filterTools(
		tools: Tool<ToolSchema>[],
		config: SubagentConfig,
	): Tool<ToolSchema>[] {
		return tools.filter((tool) => {
			const toolName = tool.name || (tool as unknown as { id?: string }).id;

			// Check blocked tools
			if (config.blocked_tools?.length) {
				const isBlocked = config.blocked_tools.some((pattern) => {
					if (pattern.endsWith('*')) {
						return toolName.startsWith(pattern.slice(0, -1));
					}
					return toolName === pattern;
				});

				if (isBlocked) return false;
			}

			// If allow list is specified, tool must be in it
			if (config.allowed_tools?.length) {
				const isAllowed = config.allowed_tools.some((pattern) => {
					if (pattern.endsWith('*')) {
						return toolName.startsWith(pattern.slice(0, -1));
					}
					return toolName === pattern;
				});

				return isAllowed;
			}

			// If neither list is specified, allow all tools
			return true;
		});
	}

	/**
	 * Get status of all subagent tools
	 */
	getStatus(): Record<
		string,
		{
			name: string;
			healthy: boolean;
			recursionDepth: number;
			lastUsed?: number;
		}
	> {
		const status: Record<
			string,
			{
				name: string;
				healthy: boolean;
				recursionDepth: number;
				lastUsed?: number;
			}
		> = {};

		for (const [name] of this.runners) {
			status[name] = {
				name: `agent.${name}`,
				healthy: false, // Would need health check implementation
				recursionDepth: this.recursionDepth.get(name) || 0,
			};
		}

		return status;
	}
}
