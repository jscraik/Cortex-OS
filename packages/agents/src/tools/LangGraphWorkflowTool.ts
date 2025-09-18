/**
 * LangGraph Workflow Tool
 *
 * Enables execution of complex multi-agent workflows using LangGraph.
 */

import { createPinoLogger } from '@voltagent/logger';
import { z } from 'zod';
import { Tool, type ToolSchema } from '../mocks/voltagent-core.js';
import type { IToolRegistry } from '../types.js';
import {
	WorkflowTemplates,
	createLangGraphWorkflow,
} from '../workflows/langgraph-integration.js';

const logger = createPinoLogger({ name: 'LangGraphWorkflowTool' });

/**
 * Schema for LangGraph workflow execution
 */
const LangGraphWorkflowSchema = z.object({
	/** The task to execute */
	task: z.string().min(1),
	/** Additional context for the task */
	context: z.string().optional(),
	/** Workflow template to use (optional) */
	template: z.enum(['code-review', 'documentation', 'testing']).optional(),
	/** Maximum number of iterations */
	maxIterations: z.number().min(1).max(50).default(10),
});

export type LangGraphWorkflowInput = z.infer<typeof LangGraphWorkflowSchema>;

/**
 * Tool for executing LangGraph workflows
 */
export class LangGraphWorkflowTool extends Tool<LangGraphWorkflowSchema> {
	constructor(private readonly toolRegistry: IToolRegistry) {
		super({
			name: 'langgraph-workflow',
			description:
				'Execute complex multi-step workflows using LangGraph state machines',
			schema: LangGraphWorkflowSchema,
		});
	}

	async execute(input: LangGraphWorkflowInput): Promise<any> {
		try {
			logger.info('Executing LangGraph workflow:', input);

			// Get available tools from the registry
			const toolNames = this.toolRegistry.list();
			const availableTools = toolNames
				.map((name) => {
					try {
						return this.toolRegistry.get(name);
					} catch {
						return null;
					}
				})
				.filter(Boolean);

			// Create workflow engine
			const workflowEngine = createLangGraphWorkflow(
				availableTools,
				input.maxIterations,
			);

			// Execute workflow
			const result = await workflowEngine.execute({
				task: input.task,
				context: input.context,
				maxIterations: input.maxIterations,
			});

			logger.info('LangGraph workflow completed successfully');

			return {
				success: true,
				result: result.result,
				steps: result.steps,
				usage: result.usage,
				executionTime: Date.now(),
			};
		} catch (error) {
			logger.error('LangGraph workflow execution failed:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
				executionTime: Date.now(),
			};
		}
	}
}

/**
 * Create a LangGraph workflow tool
 */
export function createLangGraphWorkflowTool(
	toolRegistry: IToolRegistry,
): LangGraphWorkflowTool {
	return new LangGraphWorkflowTool(toolRegistry);
}

/**
 * Helper function to list available workflow templates
 */
export function listWorkflowTemplates(): Array<{
	name: string;
	description: string;
	steps: string[];
}> {
	return Object.entries(WorkflowTemplates).map(([key, template]) => ({
		name: key,
		description: template.description,
		steps: template.steps.map((s) => s.step),
	}));
}
