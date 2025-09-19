import { END, StateGraph } from '@langchain/langgraph';
import { z } from 'zod';
import { CategorizedError, ErrorBoundary, ErrorType } from './error-boundary.js';

// Workflow state schema
export const WorkflowStateSchema = z.object({
	// Input state
	input: z.string(),
	taskType: z.string(),
	requiredCapabilities: z.array(z.string()).optional(),

	// Model selection
	selectedModel: z.any().optional(),
	modelConfig: z.any().optional(),

	// Execution state
	phase: z.enum(['planning', 'execution', 'validation', 'completion']),
	status: z.enum(['pending', 'running', 'completed', 'failed']),
	progress: z.number().min(0).max(1).default(0),

	// Results
	output: z.any().optional(),
	error: z.string().optional(),
	evidence: z.array(z.any()).default([]),
	artifacts: z.array(z.any()).default([]),

	// Metadata
	startTime: z.string().optional(),
	endTime: z.string().optional(),
	executionTime: z.number().optional(),

	// Retry tracking
	retryCount: z.number().default(0),
	maxRetries: z.number().default(3),
});

export type WorkflowState = z.infer<typeof WorkflowStateSchema>;

/**
 * LangGraph-based workflow orchestrator
 */
export class LangGraphWorkflow {
	private graph: StateGraph<WorkflowState>;
	private errorBoundary = new ErrorBoundary();
	private modelSelector: any; // Will be properly typed when ModelSelector is imported

	constructor(modelSelector: any) {
		this.modelSelector = modelSelector;
		this.graph = this.createWorkflowGraph();
	}

	/**
	 * Create the workflow graph with nodes and edges
	 */
	private createWorkflowGraph(): StateGraph<WorkflowState> {
		const workflow = new StateGraph(WorkflowStateSchema);

		// Add nodes
		workflow.addNode('start', this.startNode.bind(this));
		workflow.addNode('selectModel', this.selectModelNode.bind(this));
		workflow.addNode('execute', this.executeNode.bind(this));
		workflow.addNode('validate', this.validateNode.bind(this));
		workflow.addNode('handleError', this.handleErrorNode.bind(this));
		workflow.addNode('complete', this.completeNode.bind(this));

		// Set entry point
		workflow.setEntryPoint('start' as any);

		// Add edges
		workflow.addEdge('start' as any, 'selectModel' as any);
		workflow.addEdge('selectModel' as any, 'execute' as any);
		workflow.addEdge('execute' as any, 'validate' as any);

		// Add conditional edges
		workflow.addConditionalEdges('validate' as any, this.shouldRetryOrComplete.bind(this), {
			retry: 'execute',
			complete: 'complete',
			error: 'handleError',
		} as any);

		workflow.addConditionalEdges('handleError' as any, this.shouldRetryOrFail.bind(this), {
			retry: 'execute',
			fail: END,
		} as any);

		workflow.addEdge('complete' as any, END);

		return workflow;
	}

	/**
	 * Start node - Initialize workflow state
	 */
	private async startNode(_state: WorkflowState): Promise<Partial<WorkflowState>> {
		console.log('Starting workflow execution');
		return {
			phase: 'planning',
			status: 'running',
			startTime: new Date().toISOString(),
			retryCount: 0,
		};
	}

	/**
	 * Select model node - Choose optimal model for the task
	 */
	private async selectModelNode(state: WorkflowState): Promise<Partial<WorkflowState>> {
		try {
			const taskType = state.taskType || this.modelSelector.detectTaskType(state.input);
			const inputTokens = this.estimateTokenCount(state.input);

			const selectedModel = this.modelSelector.selectOptimalModel(
				taskType,
				inputTokens,
				state.requiredCapabilities as any[],
			);

			if (!selectedModel) {
				throw new CategorizedError(
					ErrorType.RESOURCE,
					'No suitable model found for the given requirements',
					{ taskType, inputTokens, requiredCapabilities: state.requiredCapabilities },
				);
			}

			return {
				selectedModel: selectedModel.id,
				modelConfig: selectedModel,
				taskType,
				progress: 0.2,
			};
		} catch (error) {
			return {
				error: error instanceof Error ? error.message : String(error),
				status: 'failed',
			};
		}
	}

	/**
	 * Execute node - Run the main task
	 */
	private async executeNode(state: WorkflowState): Promise<Partial<WorkflowState>> {
		if (state.status === 'failed') {
			return state;
		}

		try {
			// Execute with error boundary
			const result = await this.errorBoundary.execute(
				async () => {
					// This would be implemented based on specific task requirements
					return await this.executeTask(state);
				},
				{
					operationName: 'executeTask',
					timeout: 30000,
					onError: (error) => {
						console.error('Task execution failed:', error);
					},
				},
			);

			return {
				output: result,
				phase: 'execution',
				progress: 0.8,
				evidence: result.evidence || [],
				artifacts: result.artifacts || [],
			};
		} catch (error) {
			return {
				error: error instanceof Error ? error.message : String(error),
				retryCount: (state.retryCount || 0) + 1,
			};
		}
	}

	/**
	 * Validate node - Validate results
	 */
	private async validateNode(state: WorkflowState): Promise<Partial<WorkflowState>> {
		if (state.error) {
			return { status: 'failed' };
		}

		try {
			// Validate output
			const isValid = await this.validateOutput(state.output);

			if (!isValid) {
				return {
					error: 'Output validation failed',
					retryCount: (state.retryCount || 0) + 1,
				};
			}

			return {
				phase: 'completion',
				status: 'completed',
				progress: 1.0,
				endTime: new Date().toISOString(),
				executionTime: Date.now() - new Date(state.startTime!).getTime(),
			};
		} catch (error) {
			return {
				error: error instanceof Error ? error.message : String(error),
				status: 'failed',
			};
		}
	}

	/**
	 * Handle error node - Process errors
	 */
	private async handleErrorNode(state: WorkflowState): Promise<Partial<WorkflowState>> {
		console.error('Workflow error:', state.error);
		return state;
	}

	/**
	 * Complete node - Finalize workflow
	 */
	private async completeNode(_state: WorkflowState): Promise<Partial<WorkflowState>> {
		console.log('Workflow completed successfully');
		return {
			phase: 'completion',
			status: 'completed',
			endTime: new Date().toISOString(),
		};
	}

	/**
	 * Determine if should retry or complete
	 */
	private shouldRetryOrComplete(state: WorkflowState): string {
		if (state.status === 'failed') {
			return 'error';
		}

		if (state.error && state.retryCount! < state.maxRetries) {
			return 'retry';
		}

		return 'complete';
	}

	/**
	 * Determine if should retry or fail
	 */
	private shouldRetryOrFail(state: WorkflowState): string {
		if (state.retryCount! < state.maxRetries) {
			return 'retry';
		}

		return 'fail';
	}

	/**
	 * Execute the specific task (to be implemented by subclasses)
	 */
	private async executeTask(_state: WorkflowState): Promise<any> {
		// This is a placeholder - actual implementation depends on specific workflow
		throw new Error('executeTask must be implemented by subclass');
	}

	/**
	 * Validate output (to be implemented by subclasses)
	 */
	private async validateOutput(output: any): Promise<boolean> {
		// Basic validation - can be overridden
		return output !== null && output !== undefined;
	}

	/**
	 * Estimate token count from input
	 */
	private estimateTokenCount(text: string): number {
		// Simple estimation: ~4 chars per token
		return Math.ceil(text.length / 4);
	}

	/**
	 * Execute the workflow
	 */
	async execute(
		input: string,
		options: {
			taskType?: string;
			requiredCapabilities?: string[];
			maxRetries?: number;
		} = {},
	): Promise<WorkflowState> {
		const initialState: WorkflowState = {
			input,
			taskType: options.taskType || 'general',
			requiredCapabilities: options.requiredCapabilities,
			maxRetries: options.maxRetries || 3,
			phase: 'planning',
			status: 'pending',
			progress: 0,
			evidence: [],
			artifacts: [],
			retryCount: 0,
		};

		// Create and run the workflow
		const app = this.graph.compile();
		const result = await app.invoke(initialState);

		return WorkflowStateSchema.parse(result);
	}

	/**
	 * Get workflow graph visualization
	 */
	getGraphVisualization(): string {
		// Return a textual representation of the workflow
		return `
Workflow Graph:
start → selectModel → execute → validate
                           ↓
validate → retry → execute
    ↓
complete → END
    ↓
error → handleError → retry/fail
    `;
	}
}
