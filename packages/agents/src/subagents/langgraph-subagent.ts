/**
 * LangGraph Subagent for Complex Workflows
 *
 * Handles complex multi-step workflows using LangGraph state machines.
 */

import { createPinoLogger } from '@voltagent/logger';
import {
	createLangGraphWorkflow,
	type WorkflowInput,
	type WorkflowOutput,
	WorkflowTemplates,
} from '../workflows/langgraph-integration.js';
import type { Tool } from './mocks/voltagent-core.js';
import type { ISubagent } from './types.js';

const logger = createPinoLogger({ name: 'LangGraphSubagent' });

/**
 * Subagent that executes complex workflows using LangGraph
 */
export class LangGraphSubagent implements ISubagent {
	id: string;
	name: string;
	capabilities: string[];
	workflowEngine: ReturnType<typeof createLangGraphWorkflow>;
	activeWorkflows: Map<string, Promise<WorkflowOutput>> = new Map();

	constructor(
		tools: Tool[] = [],
		private readonly maxIterations: number = 10,
	) {
		this.id = `langgraph-${Date.now()}`;
		this.name = 'LangGraph Workflow Engine';
		this.capabilities = [
			'execute-workflow',
			'code-review',
			'documentation-generation',
			'testing-workflow',
			'complex-task-orchestration',
		];
		this.workflowEngine = createLangGraphWorkflow(tools, maxIterations);
	}

	/**
	 * Execute a workflow task
	 */
	async execute(input: any, _context?: any): Promise<any> {
		const workflowId = generateId();

		try {
			logger.info(`Executing workflow ${workflowId}:`, input);

			// Check if this is a template workflow
			let workflowInput: WorkflowInput;

			if (
				input.template &&
				WorkflowTemplates[input.template as keyof typeof WorkflowTemplates]
			) {
				const template =
					WorkflowTemplates[input.template as keyof typeof WorkflowTemplates];
				workflowInput = {
					task: `${template.name}: ${input.task || template.description}`,
					context: input.context,
					tools: input.tools,
					maxIterations: input.maxIterations || this.maxIterations,
				};
			} else {
				// Custom workflow
				workflowInput = {
					task: input.task || 'Unnamed workflow',
					context: input.context,
					tools: input.tools,
					maxIterations: input.maxIterations || this.maxIterations,
				};
			}

			// Start the workflow
			const workflowPromise = this.workflowEngine.execute(workflowInput);
			this.activeWorkflows.set(workflowId, workflowPromise);

			// Wait for completion
			const result = await workflowPromise;

			// Clean up
			this.activeWorkflows.delete(workflowId);

			logger.info(`Workflow ${workflowId} completed successfully`);

			return {
				workflowId,
				result: result.result,
				steps: result.steps,
				usage: result.usage,
				status: 'completed',
			};
		} catch (error) {
			// Clean up on error
			this.activeWorkflows.delete(workflowId);

			logger.error(`Workflow ${workflowId} failed:`, error);

			return {
				workflowId,
				error: error instanceof Error ? error.message : String(error),
				status: 'failed',
			};
		}
	}

	/**
	 * Get the status of active workflows
	 */
	async getStatus(): Promise<any> {
		return {
			activeWorkflows: this.activeWorkflows.size,
			workflowIds: Array.from(this.activeWorkflows.keys()),
			capabilities: this.capabilities,
		};
	}

	/**
	 * List available workflow templates
	 */
	listTemplates(): Array<{
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

	/**
	 * Get the workflow graph structure (for visualization)
	 */
	getGraphStructure() {
		return this.workflowEngine.getGraphStructure();
	}

	/**
	 * Cancel a running workflow
	 */
	async cancelWorkflow(workflowId: string): Promise<boolean> {
		// Note: LangGraph doesn't have built-in cancellation
		// This is a placeholder for future implementation
		const workflow = this.activeWorkflows.get(workflowId);
		if (workflow) {
			// In a real implementation, we would cancel the workflow
			this.activeWorkflows.delete(workflowId);
			logger.info(`Cancelled workflow ${workflowId}`);
			return true;
		}
		return false;
	}
}

/**
 * Create a LangGraph subagent
 */
export function createLangGraphSubagent(
	tools: Tool[] = [],
	maxIterations = 10,
): LangGraphSubagent {
	return new LangGraphSubagent(tools, maxIterations);
}

/**
 * Generate a unique ID
 */
function generateId(): string {
	return Math.random().toString(36).substring(2) + Date.now().toString(36);
}
