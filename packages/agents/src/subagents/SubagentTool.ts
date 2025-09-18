/**
 * Subagent Tool Materialization
 *
 * Turns each subagent into a callable tool with the pattern `agent.<name>`.
 * Implements recursion guards, context isolation, and proper tool gating.
 */

import { z } from 'zod';
import {
	type Subagent,
	type SubagentConfig,
	type SubagentRunInput,
	type SubagentRunResult,
	SubagentRunResultSchema,
} from '../nO/contracts';

// Tool interface compatible with existing ToolEngine
export interface Tool {
	name: string;
	description: string;
	schema: any; // Zod schema
	call(args: any, ctx?: { caller?: string; depth?: number }): Promise<any>;
}

/**
 * Materialize a subagent as a callable tool
 */
export function materializeSubagentTool(config: SubagentConfig, subagent: Subagent): Tool {
	// Define the tool schema
	const schema = z.object({
		task: z.string().describe('The task to execute'),
		context: z.record(z.unknown()).optional().describe('Additional context for the task'),
		budget: z
			.object({
				tokens: z.number().int().positive().optional().describe('Token budget for execution'),
				ms: z.number().int().positive().optional().describe('Time budget in milliseconds'),
			})
			.optional()
			.describe('Execution budget limits'),
	});

	return {
		// Tool name follows pattern: agent.<subagent-name>
		name: `agent.${config.name}`,

		// Use the subagent's description
		description: config.description,

		// The schema for tool arguments
		schema,

		/**
		 * Execute the subagent tool
		 */
		async call(args, ctx?: { caller?: string; depth?: number }): Promise<any> {
			// Recursion guard: prevent subagent from calling itself
			if (ctx?.caller === `agent.${config.name}`) {
				return {
					text: `Blocked recursive call to ${config.name}`,
					success: false,
					error: 'RECURSION_BLOCKED',
				};
			}

			// Prepare input for subagent
			const input: SubagentRunInput = {
				task: args.task,
				context: args.context,
				budget: args.budget,
				depth: (ctx?.depth || 0) + 1,
				caller: ctx?.caller || 'parent',
			};

			try {
				// Execute subagent with isolated context
				const result = await subagent.execute(input);

				// Return in format expected by ToolEngine
				return {
					text: result.output,
					artifacts: result.artifacts,
					traceId: result.traceId,
					metrics: result.metrics,
					success: true,
				};
			} catch (error) {
				// Handle errors gracefully
				return {
					text: `Error executing ${config.name}: ${error instanceof Error ? error.message : String(error)}`,
					success: false,
					error: error instanceof Error ? error.message : String(error),
				};
			}
		},
	};
}

/**
 * Create an auto-delegation tool that can select and run multiple subagents
 */
export function createAutoDelegateTool(
	subagents: Map<string, Subagent>,
	selectSubagents?: (task: string, k: number) => Promise<SubagentConfig[]>,
): Tool {
	const schema = z.object({
		task: z.string().describe('The task to delegate'),
		k: z.number().int().min(1).max(4).default(2).describe('Number of subagents to select'),
		budget: z
			.object({
				tokens: z.number().int().positive().optional().describe('Total token budget'),
				ms: z.number().int().positive().optional().describe('Total time budget in milliseconds'),
			})
			.optional()
			.describe('Budget to split among subagents'),
	});

	return {
		name: 'agent.autodelegate',
		description: 'Select K relevant subagents and run them in parallel; returns merged summary',
		schema,

		async call(args, ctx?: { caller?: string; depth?: number }): Promise<any> {
			try {
				// Select relevant subagents
				const selected =
					(await selectSubagents?.(args.task, args.k)) ||
					Array.from(subagents.keys()).slice(0, args.k);

				if (selected.length === 0) {
					return {
						text: 'No subagents available for delegation',
						success: false,
					};
				}

				// Split budget among subagents
				const perAgentBudget = args.budget
					? {
							tokens: args.budget.tokens
								? Math.floor((args.budget.tokens || 0) / selected.length)
								: undefined,
							ms: args.budget.ms ? Math.floor((args.budget.ms || 0) / selected.length) : undefined,
						}
					: undefined;

				// Execute subagents in parallel
				const promises = selected.map(async (config) => {
					const subagent = subagents.get(config.name);
					if (!subagent) return null;

					const input: SubagentRunInput = {
						task: args.task,
						context: { origin: 'autodelegate', selected },
						budget: perAgentBudget,
						depth: (ctx?.depth || 0) + 1,
						caller: `agent.autodelegate`,
					};

					try {
						const result = await subagent.execute(input);
						return {
							name: config.name,
							success: true,
							output: result.output,
							artifacts: result.artifacts,
							metrics: result.metrics,
							traceId: result.traceId,
						};
					} catch (error) {
						return {
							name: config.name,
							success: false,
							error: error instanceof Error ? error.message : String(error),
						};
					}
				});

				const results = await Promise.all(promises);

				// Filter out null results
				const validResults = results.filter((r) => r !== null);

				// Format the consolidated output
				const successful = validResults.filter((r) => r.success);
				const failed = validResults.filter((r) => !r.success);

				let output = '';

				// Add successful results
				if (successful.length > 0) {
					output += successful.map((r) => `[${r.name}]\n${r.output}`).join('\n\n');
				}

				// Add failure information
				if (failed.length > 0) {
					output += '\n\nFailed executions:\n';
					output += failed.map((r) => `- ${r.name}: ${r.error}`).join('\n');
				}

				// Calculate aggregate metrics
				const aggregateMetrics =
					successful.length > 0
						? {
								totalTokens: successful.reduce((sum, r) => sum + (r.metrics?.tokensUsed || 0), 0),
								totalTime: successful.reduce((sum, r) => sum + (r.metrics?.executionTime || 0), 0),
								agentsExecuted: successful.length,
							}
						: undefined;

				return {
					text: output,
					success: successful.length > 0,
					artifacts: successful.reduce((acc, r) => ({ ...acc, ...r.artifacts }), {}),
					metrics: aggregateMetrics,
					delegatedTo: selected.map((s) => s.name),
				};
			} catch (error) {
				return {
					text: `Auto-delegation failed: ${error instanceof Error ? error.message : String(error)}`,
					success: false,
					error: error instanceof Error ? error.message : String(error),
				};
			}
		},
	};
}

/**
 * Create a tool for listing available subagents
 */
export function createListSubagentsTool(subagents: Map<string, Subagent>): Tool {
	return {
		name: 'agent.list',
		description: 'List all available subagents and their capabilities',
		schema: z.object({}),

		async call() {
			const agentList = Array.from(subagents.entries()).map(([name, subagent]) => ({
				name,
				description: subagent.config.description,
				capabilities: subagent.config.capabilities,
				tools: subagent.getAvailableTools(),
				model: subagent.config.model || 'inherit',
				scope: subagent.config.scope,
			}));

			return {
				text: JSON.stringify(agentList, null, 2),
				success: true,
				count: agentList.length,
			};
		},
	};
}

/**
 * Create a tool for getting subagent health
 */
export function createSubagentHealthTool(subagents: Map<string, Subagent>): Tool {
	const schema = z.object({
		agentName: z.string().describe('Name of the subagent to check health for'),
	});

	return {
		name: 'agent.health',
		description: 'Get health status of a specific subagent',
		schema,

		async call(args) {
			const subagent = subagents.get(args.agentName);

			if (!subagent) {
				return {
					text: `Subagent '${args.agentName}' not found`,
					success: false,
				};
			}

			try {
				const health = await subagent.getHealth();
				const metrics = subagent.getMetrics();

				return {
					text: JSON.stringify(
						{
							name: args.agentName,
							health,
							metrics,
						},
						null,
						2,
					),
					success: true,
				};
			} catch (error) {
				return {
					text: `Failed to get health for ${args.agentName}: ${error instanceof Error ? error.message : String(error)}`,
					success: false,
				};
			}
		},
	};
}
