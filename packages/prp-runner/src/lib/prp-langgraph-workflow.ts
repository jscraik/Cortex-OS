import { END, StateGraph } from '@langchain/langgraph';
import { z } from 'zod';
import type { ASBRAIIntegration } from '../asbr-ai-integration.js';
import { ErrorBoundary } from './error-boundary.js';
import type { ModelCapability, ModelSelector } from './model-selector.js';

// PRP-specific state schema
export const PRPWorkflowStateSchema = z.object({
	// Input
	prp: z.any(),
	context: z.any(),

	// Gate states
	gates: z
		.record(
			z.object({
				status: z.enum(['pending', 'running', 'passed', 'failed', 'skipped']),
				result: z.any().optional(),
				error: z.string().optional(),
				executionTime: z.number().optional(),
				retryCount: z.number().optional(),
			}),
		)
		.default({}),

	// Workflow state
	currentGate: z.string().optional(),
	phase: z
		.enum([
			'g0-ideation',
			'g1-architecture',
			'g2-test-plan',
			'g3-code-review',
			'g4-verification',
			'g5-triage',
			'g6-release-readiness',
			'g7-release',
			'completed',
		])
		.optional(),
	status: z.enum(['pending', 'running', 'completed', 'failed']),

	// Model selection
	selectedModel: z.any().optional(),
	modelConfig: z.any().optional(),

	// Results
	evidence: z.array(z.any()).default([]),
	insights: z.any().optional(),
	artifacts: z.array(z.any()).default([]),

	// Error handling
	error: z.string().optional(),

	// Metadata
	startTime: z.string().optional(),
	endTime: z.string().optional(),
	totalExecutionTime: z.number().optional(),
});

export type PRPWorkflowState = z.infer<typeof PRPWorkflowStateSchema>;

/**
 * PRP Workflow using LangGraph state management
 */
export class PRPLangGraphWorkflow {
	private graph: any; // Compiled LangGraph
	private modelSelector: ModelSelector;
	private errorBoundary = new ErrorBoundary();

	// Gate definitions
	private gates = [
		'g0-ideation',
		'g1-architecture',
		'g2-test-plan',
		'g3-code-review',
		'g4-verification',
		'g5-triage',
		'g6-release-readiness',
		'g7-release',
	];

	constructor(aiIntegration: ASBRAIIntegration, modelSelector: ModelSelector) {
		this.aiIntegration = aiIntegration;
		this.modelSelector = modelSelector;
		this.graph = this.createPRPGraph();
	}

	/**
	 * Create the PRP workflow graph
	 */
	private createPRPGraph(): any {
		const workflow = new StateGraph(PRPWorkflowStateSchema);

		// Add nodes
		workflow.addNode('initialize', this.initialize.bind(this));
		workflow.addNode('selectModel', this.selectModel.bind(this));
		workflow.addNode('executeGate', this.executeGate.bind(this));
		workflow.addNode('validateGate', this.validateGate.bind(this));
		workflow.addNode('collectEvidence', this.collectEvidence.bind(this));
		workflow.addNode('generateInsights', this.generateInsights.bind(this));
		workflow.addNode('complete', this.complete.bind(this));
		workflow.addNode('handleError', this.handleError.bind(this));

		// Set entry point and add edges with type assertions for LangGraph compatibility
		workflow.setEntryPoint('initialize' as any);

		workflow.addEdge('initialize' as any, 'selectModel' as any);
		workflow.addEdge('selectModel' as any, 'executeGate' as any);

		// Add conditional edges for gate execution
		workflow.addConditionalEdges('executeGate' as any, this.shouldContinueToNextGate.bind(this), {
			next: 'validateGate',
			error: 'handleError',
			complete: 'collectEvidence',
		} as any);

		workflow.addEdge('validateGate' as any, 'collectEvidence' as any);
		workflow.addEdge('collectEvidence' as any, 'generateInsights' as any);
		workflow.addEdge('generateInsights' as any, 'complete' as any);

		// Error handling
		workflow.addConditionalEdges('handleError' as any, this.shouldRetryOrAbort.bind(this), {
			retry: 'executeGate',
			abort: END,
		} as any);

		workflow.addEdge('complete' as any, END);

		return workflow.compile();
	}

	/**
	 * Initialize workflow
	 */
	private async initialize(_state: PRPWorkflowState): Promise<Partial<PRPWorkflowState>> {
		console.log('Initializing PRP workflow');

		// Initialize gate states
		const gateStates: Record<string, any> = {};
		this.gates.forEach((gateId) => {
			gateStates[gateId] = {
				status: 'pending',
			};
		});

		return {
			gates: gateStates,
			currentGate: this.gates[0],
			phase: this.gates[0] as any,
			status: 'running',
			startTime: new Date().toISOString(),
		};
	}

	/**
	 * Select optimal model for PRP processing
	 */
	private async selectModel(_state: PRPWorkflowState): Promise<Partial<PRPWorkflowState>> {
		try {
			const taskType = 'prp-analysis';
			const requiredCapabilities: ModelCapability[] = ['code-analysis', 'documentation'];

			const selectedModel = this.modelSelector.selectOptimalModel(
				taskType,
				undefined, // input tokens
				requiredCapabilities,
			);

			if (!selectedModel) {
				throw new Error('No suitable model found for PRP analysis');
			}

			return {
				selectedModel: selectedModel.id,
				modelConfig: selectedModel,
			};
		} catch (error) {
			return {
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	/**
	 * Execute current gate
	 */
	private async executeGate(state: PRPWorkflowState): Promise<Partial<PRPWorkflowState>> {
		if (!state.currentGate || state.error) {
			return state;
		}

		try {
			const gateId = state.currentGate;
			console.log(`Executing gate: ${gateId}`);

			// Update gate status
			const updatedGates = { ...state.gates };
			updatedGates[gateId] = {
				...updatedGates[gateId],
				status: 'running',
			};

			// Execute gate with error boundary
			const result = await this.errorBoundary.execute(
				async () => {
					return await this.executeSpecificGate(gateId, state);
				},
				{
					operationName: `gate-${gateId}`,
					timeout: 60000, // 1 minute per gate
					onError: (error) => {
						console.error(`Gate ${gateId} failed:`, error);
					},
				},
			);

			return {
				gates: {
					...updatedGates,
					[gateId]: {
						...updatedGates[gateId],
						status: 'passed',
						result,
					},
				},
			};
		} catch (error) {
			return {
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	/**
	 * Execute specific gate logic
	 */
	private async executeSpecificGate(gateId: string, _state: PRPWorkflowState): Promise<any> {
		// Simple stub implementation for now
		return {
			status: 'passed',
			result: { message: `Gate ${gateId} completed` },
		};
	}

	/**
	 * Validate gate execution
	 */
	private async validateGate(state: PRPWorkflowState): Promise<Partial<PRPWorkflowState>> {
		if (state.error) {
			return { status: 'failed' };
		}

		const currentGate = state.currentGate;
		if (!currentGate) {
			return { error: 'No current gate to validate' };
		}

		const gateState = state.gates[currentGate];
		if (!gateState || gateState.status !== 'passed') {
			return {
				error: `Gate ${currentGate} validation failed`,
			};
		}

		return { status: 'running' };
	}

	/**
	 * Collect evidence from completed gates
	 */
	private async collectEvidence(state: PRPWorkflowState): Promise<Partial<PRPWorkflowState>> {
		if (state.error) {
			return state;
		}

		const evidence: any[] = [];
		const artifacts: any[] = [];

		// Collect evidence from all completed gates
		for (const [gateId, gateState] of Object.entries(state.gates)) {
			if (gateState.status === 'passed' && gateState.result) {
				evidence.push({
					gateId,
					result: gateState.result,
					timestamp: new Date().toISOString(),
				});

				if (gateState.result.artifacts) {
					artifacts.push(...gateState.result.artifacts);
				}
			}
		}

		return {
			evidence: [...(state.evidence || []), ...evidence],
			artifacts: [...(state.artifacts || []), ...artifacts],
		};
	}

	/**
	 * Generate insights from collected evidence
	 */
	private async generateInsights(state: PRPWorkflowState): Promise<Partial<PRPWorkflowState>> {
		if (state.error) {
			return state;
		}

		try {
			// Simple insights generation for now
			const insights = {
				summary: 'PRP analysis completed',
				evidenceCount: state.evidence?.length || 0,
				timestamp: new Date().toISOString(),
			};

			return {
				insights,
				phase: 'completed',
			};
		} catch (error) {
			return {
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	/**
	 * Complete workflow
	 */
	private async complete(state: PRPWorkflowState): Promise<Partial<PRPWorkflowState>> {
		return {
			status: 'completed',
			endTime: new Date().toISOString(),
			totalExecutionTime: state.startTime
				? Date.now() - new Date(state.startTime).getTime()
				: undefined,
		};
	}

	/**
	 * Handle errors in workflow
	 */
	private async handleError(state: PRPWorkflowState): Promise<Partial<PRPWorkflowState>> {
		console.error('PRP workflow error:', state.error);

		// Check if we should retry
		const currentGate = state.currentGate;
		if (currentGate) {
			const gateState = state.gates[currentGate];
			if (gateState && (gateState.retryCount || 0) < 3) {
				return {
					gates: {
						...state.gates,
						[currentGate]: {
							...gateState,
							retryCount: (gateState.retryCount || 0) + 1,
						},
					},
					error: undefined, // Clear error for retry
				};
			}
		}

		return {
			status: 'failed',
			endTime: new Date().toISOString(),
		};
	}

	/**
	 * Determine next step after gate execution
	 */
	private shouldContinueToNextGate(state: PRPWorkflowState): string {
		if (state.error) {
			return 'error';
		}

		// Check if current gate completed successfully
		const currentGate = state.currentGate;
		if (currentGate && state.gates[currentGate]?.status === 'passed') {
			// Check if we have more gates to execute
			const currentIndex = this.gates.indexOf(currentGate);
			if (currentIndex < this.gates.length - 1) {
				return 'next';
			} else {
				return 'complete';
			}
		}

		return 'error';
	}

	/**
	 * Determine whether to retry or abort on error
	 */
	private shouldRetryOrAbort(state: PRPWorkflowState): string {
		const currentGate = state.currentGate;
		if (currentGate) {
			const gateState = state.gates[currentGate];
			if (gateState && (gateState.retryCount || 0) < 3) {
				return 'retry';
			}
		}
		return 'abort';
	}

	/**
	 * Run the PRP workflow
	 */
	async run(prp: any, context: any): Promise<PRPWorkflowState> {
		const initialState: PRPWorkflowState = {
			prp,
			context,
			gates: {},
			status: 'pending',
			evidence: [],
			artifacts: [],
			phase: 'g0-ideation',
		};

		try {
			const result = await this.graph.invoke(initialState);
			return result;
		} catch (error) {
			console.error('PRP workflow execution failed:', error);
			throw error;
		}
	}
}
