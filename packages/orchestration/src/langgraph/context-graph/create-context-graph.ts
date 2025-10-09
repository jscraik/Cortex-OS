/**
 * Context Graph State Graph for brAInwav Cortex-OS
 *
 * Implements LangGraph.js state orchestration for context graph operations
 * with thermal awareness, evidence gating, and budget enforcement.
 *
 * State Graph Flow: slice → plan → execute → pack
 *
 * Key Features:
 * - State graph workflow for context operations
 * - Thermal-aware node execution
 * - Budget enforcement and token management
 * - Evidence gating and ABAC compliance
 * - Error handling and graceful degradation
 * - Integration with existing CerebrumGraph thermal management
 */

import type { ContextPackService } from '@cortex-os/memory-core/src/context-graph/ContextPackService.js';
import type { ContextSliceService } from '@cortex-os/memory-core/src/context-graph/ContextSliceService.js';
import type { EvidenceGate } from '@cortex-os/memory-core/src/context-graph/evidence/EvidenceGate.js';
import type { ThermalMonitor } from '@cortex-os/memory-core/src/context-graph/thermal/ThermalMonitor.js';
import type { HybridRoutingEngine } from '@cortex-os/model-gateway/src/hybrid-router/HybridRoutingEngine.js';
import { END, StateGraph } from '@langchain/langgraph';
import { z } from 'zod';

export const ContextGraphStateSchema = z.object({
	// Input state
	query: z.string(),
	recipe: z.any().optional(),
	modelPreferences: z.any().optional(),
	privacyMode: z.boolean().default(false),
	evidenceRequired: z.boolean().default(true),
	requestId: z.string().optional(),
	userId: z.string().optional(),

	// Workflow state
	currentStep: z.enum(['slice', 'plan', 'execute', 'pack', 'error']).default('slice'),
	stepStartTime: z.number().optional(),
	stepHistory: z.array(z.string()).default([]),

	// Context graph state
	subgraph: z.any().optional(),
	packedContext: z.string().optional(),
	citations: z.any().optional(),
	evidence: z.any().optional(),

	// Model routing state
	routingDecision: z.any().optional(),
	modelResponse: z.any().optional(),

	// Thermal state
	thermalStatus: z.any().optional(),
	thermalConstraints: z.any().optional(),

	// Budget and tokens
	tokensUsed: z.number().default(0),
	budgetRemaining: z.number().optional(),
	costAccrued: z.number().default(0),

	// Error state
	error: z.string().optional(),
	recoveryAttempts: z.number().default(0),

	// Metadata
	metadata: z.record(z.any()).default({}),
	brainwavGenerated: z.boolean().default(true),
	brainwavThermalManaged: z.boolean().default(false),
});

export type ContextGraphState = z.infer<typeof ContextGraphStateSchema>;

export interface ContextGraphConfig {
	contextSliceService: ContextSliceService;
	contextPackService: ContextPackService;
	hybridRoutingEngine: HybridRoutingEngine;
	thermalMonitor: ThermalMonitor;
	evidenceGate: EvidenceGate;
	maxTokens: number;
	maxCost: number;
	enableThermalManagement: boolean;
	enableEvidenceGating: boolean;
}

export class ContextGraphOrchestrator {
	private readonly config: ContextGraphConfig;
	private readonly stateGraph: any; // LangGraph StateGraph

	constructor(config: ContextGraphConfig) {
		this.config = config;
		this.stateGraph = this.createStateGraph();
	}

	async execute(initialState: Partial<ContextGraphState>): Promise<ContextGraphState> {
		try {
			// Validate initial state
			const validatedState = ContextGraphStateSchema.parse({
				...initialState,
				currentStep: 'slice',
				stepHistory: [],
				tokensUsed: 0,
				costAccrued: 0,
				recoveryAttempts: 0,
				metadata: {
					...initialState.metadata,
					startTime: Date.now(),
					requestId:
						initialState.requestId || `ctx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
				},
			});

			// Execute the state graph
			const result = await this.stateGraph.invoke(validatedState);

			// Add final metadata
			return {
				...result,
				metadata: {
					...result.metadata,
					endTime: Date.now(),
					duration: Date.now() - (result.metadata.startTime || Date.now()),
					brainwavOrchestrated: true,
				},
			};
		} catch (error) {
			return this.createErrorState(
				initialState,
				`Context graph execution failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	private createStateGraph(): any {
		const workflow = new StateGraph({
			recipe: ContextGraphStateSchema,
		});

		// Add nodes
		workflow.addNode('slice', this.createSliceNode());
		workflow.addNode('plan', this.createPlanNode());
		workflow.addNode('execute', this.createExecuteNode());
		workflow.addNode('pack', this.createPackNode());
		workflow.addNode('error', this.createErrorNode());

		// Define conditional edges
		workflow.addConditionalEdges('slice', this.shouldProceedToPlan.bind(this), {
			plan: 'plan',
			error: 'error',
			end: END,
		});

		workflow.addConditionalEdges('plan', this.shouldProceedToExecute.bind(this), {
			execute: 'execute',
			error: 'error',
			end: END,
		});

		workflow.addConditionalEdges('execute', this.shouldProceedToPack.bind(this), {
			pack: 'pack',
			error: 'error',
			end: END,
		});

		workflow.addConditionalEdges('pack', this.shouldEnd.bind(this), {
			end: END,
			error: 'error',
		});

		// Error recovery
		workflow.addConditionalEdges('error', this.shouldRecover.bind(this), {
			slice: 'slice',
			end: END,
		});

		// Set entry point
		workflow.setEntryPoint('slice');

		return workflow.compile();
	}

	private createSliceNode() {
		return async (state: ContextGraphState): Promise<Partial<ContextGraphState>> => {
			const stepStartTime = Date.now();

			try {
				// Check thermal constraints
				let thermalStatus;
				if (this.config.enableThermalManagement) {
					thermalStatus = await this.config.thermalMonitor.getCurrentTemperature();

					if (thermalStatus.zone === 'shutdown' || thermalStatus.critical) {
						throw new Error(`Thermal shutdown triggered: ${thermalStatus.currentTemp}°C`);
					}
				}

				// Evidence validation
				if (this.config.enableEvidenceGating && state.evidenceRequired) {
					const evidenceResult = await this.config.evidenceGate.validateAccess({
						user: { id: state.userId || 'anonymous', role: 'user' },
						resource: { id: state.requestId || 'unknown', type: 'context_slice' },
						action: 'read',
						requestId: state.requestId,
					});

					if (!evidenceResult.granted) {
						throw new Error(`Evidence validation failed: ${evidenceResult.reason}`);
					}
				}

				// Create recipe if not provided
				const recipe = state.recipe || {
					query: state.query,
					maxDepth: 3,
					maxNodes: 20,
					allowedEdgeTypes: ['DEPENDS_ON', 'IMPLEMENTS_CONTRACT', 'CALLS_TOOL'],
					filters: state.metadata.filters || {},
					evidenceRequired: state.evidenceRequired,
					thermalConstraints: state.thermalConstraints,
				};

				// Apply thermal constraints if enabled
				let effectiveRecipe = recipe;
				if (this.config.enableThermalManagement && thermalStatus) {
					const thermalLimits = await this.config.thermalMonitor.getConstraints();
					if (thermalLimits.throttlingActive) {
						effectiveRecipe = {
							...recipe,
							maxDepth: Math.min(recipe.maxDepth, thermalLimits.maxDepth),
							maxNodes: Math.min(recipe.maxNodes, thermalLimits.maxNodes),
						};
					}
				}

				// Perform context slice
				const sliceResult = await this.config.contextSliceService.slice(effectiveRecipe);

				const stepDuration = Date.now() - stepStartTime;

				return {
					currentStep: 'slice',
					stepStartTime,
					stepHistory: [...state.stepHistory, 'slice'],
					subgraph: sliceResult.subgraph,
					thermalStatus,
					thermalConstraints: effectiveRecipe !== recipe,
					tokensUsed: state.tokensUsed + this.estimateTokens(JSON.stringify(sliceResult.subgraph)),
					costAccrued: state.costAccrued, // Local slicing has no cost
					metadata: {
						...state.metadata,
						sliceDuration: stepDuration,
						sliceNodesCount: sliceResult.subgraph.nodes.length,
						sliceEdgesCount: sliceResult.subgraph.edges.length,
						brainwavThermalManaged: this.config.enableThermalManagement,
					},
				};
			} catch (error) {
				return {
					currentStep: 'error',
					error: error instanceof Error ? error.message : String(error),
					stepHistory: [...state.stepHistory, 'slice'],
					recoveryAttempts: state.recoveryAttempts + 1,
					metadata: {
						...state.metadata,
						sliceError: true,
						sliceErrorTime: Date.now(),
					},
				};
			}
		};
	}

	private createPlanNode() {
		return async (state: ContextGraphState): Promise<Partial<ContextGraphState>> => {
			const stepStartTime = Date.now();

			try {
				// Create execution plan based on context and requirements
				const plan = await this.createExecutionPlan(state);

				// Check budget constraints
				const estimatedTokens =
					this.estimateTokens(JSON.stringify(state.subgraph)) +
					this.estimateTokens(state.query) +
					this.estimateTokens(JSON.stringify(plan));

				if (estimatedTokens > this.config.maxTokens) {
					throw new Error(
						`Estimated tokens ${estimatedTokens} exceed maximum ${this.config.maxTokens}`,
					);
				}

				const stepDuration = Date.now() - stepStartTime;

				return {
					currentStep: 'plan',
					stepStartTime,
					stepHistory: [...state.stepHistory, 'plan'],
					metadata: {
						...state.metadata,
						plan,
						planDuration: stepDuration,
						estimatedTokens,
						brainwavOptimized: true,
					},
				};
			} catch (error) {
				return {
					currentStep: 'error',
					error: error instanceof Error ? error.message : String(error),
					stepHistory: [...state.stepHistory, 'plan'],
					recoveryAttempts: state.recoveryAttempts + 1,
					metadata: {
						...state.metadata,
						planError: true,
						planErrorTime: Date.now(),
					},
				};
			}
		};
	}

	private createExecuteNode() {
		return async (state: ContextGraphState): Promise<Partial<ContextGraphState>> => {
			const stepStartTime = Date.now();

			try {
				// Check thermal constraints before model execution
				if (this.config.enableThermalManagement) {
					const thermalStatus = await this.config.thermalMonitor.getCurrentTemperature();

					if (thermalStatus.zone === 'critical' || thermalStatus.zone === 'shutdown') {
						throw new Error(
							`Thermal emergency: aborting model execution at ${thermalStatus.currentTemp}°C`,
						);
					}
				}

				// Prepare routing request
				const routingRequest = {
					prompt: this.generatePrompt(state),
					context: state.subgraph,
					modelPreferences: state.modelPreferences,
					privacyMode: state.privacyMode,
					evidenceRequired: state.evidenceRequired,
					thermalConstraints: state.thermalConstraints,
					requestId: state.requestId,
					userId: state.userId,
					metadata: state.metadata,
				};

				// Execute model routing
				const routingResult = await this.config.hybridRoutingEngine.route(routingRequest);

				// Check budget
				const newCostAccrued = state.costAccrued + routingResult.metadata.actualCost;
				if (newCostAccrued > this.config.maxCost) {
					throw new Error(`Cost limit exceeded: ${newCostAccrued} > ${this.config.maxCost}`);
				}

				const stepDuration = Date.now() - stepStartTime;

				return {
					currentStep: 'execute',
					stepStartTime,
					stepHistory: [...state.stepHistory, 'execute'],
					routingDecision: routingResult.decision,
					modelResponse: routingResult.response,
					tokensUsed: state.tokensUsed + routingResult.metadata.tokensUsed,
					costAccrued: newCostAccrued,
					thermalStatus: routingResult.decision.thermalConstrained
						? await this.config.thermalMonitor.getCurrentTemperature()
						: state.thermalStatus,
					metadata: {
						...state.metadata,
						executeDuration: stepDuration,
						modelUsed: routingResult.decision.modelId,
						modelType: routingResult.decision.modelType,
						slaMet: routingResult.performance.slaMet,
						brainwavRouted: true,
					},
				};
			} catch (error) {
				return {
					currentStep: 'error',
					error: error instanceof Error ? error.message : String(error),
					stepHistory: [...state.stepHistory, 'execute'],
					recoveryAttempts: state.recoveryAttempts + 1,
					metadata: {
						...state.metadata,
						executeError: true,
						executeErrorTime: Date.now(),
					},
				};
			}
		};
	}

	private createPackNode() {
		return async (state: ContextGraphState): Promise<Partial<ContextGraphState>> => {
			const stepStartTime = Date.now();

			try {
				// Pack context with model response
				const packOptions = {
					includeCitations: true,
					maxTokens: Math.min(4000, this.config.maxTokens - state.tokensUsed),
					format: 'markdown',
					branding: true,
					privacyMode: state.privacyMode,
					includeEvidence: state.evidenceRequired,
				};

				// Combine subgraph with model response
				const enhancedSubgraph = {
					...state.subgraph,
					nodes: [
						...state.subgraph.nodes,
						{
							id: 'model-response',
							type: 'MODEL_RESPONSE',
							key: 'response',
							label: 'Model Response',
							path: 'model://response',
							content: JSON.stringify(state.modelResponse),
							metadata: {
								modelUsed: state.routingDecision?.modelId,
								tokensUsed: state.tokensUsed,
								cost: state.costAccrued,
								brainwavGenerated: true,
							},
						},
					],
				};

				const packResult = await this.config.contextPackService.pack(enhancedSubgraph, packOptions);

				const stepDuration = Date.now() - stepStartTime;

				return {
					currentStep: 'pack',
					stepStartTime,
					stepHistory: [...state.stepHistory, 'pack'],
					packedContext: packResult.packedContext,
					citations: packResult.citations,
					evidence: packResult.evidence,
					tokensUsed: state.tokensUsed + packResult.metadata.totalTokens,
					metadata: {
						...state.metadata,
						packDuration: stepDuration,
						packFormat: packResult.metadata.format,
						finalContextLength: packResult.packedContext.length,
						brainwavGenerated: true,
					},
				};
			} catch (error) {
				return {
					currentStep: 'error',
					error: error instanceof Error ? error.message : String(error),
					stepHistory: [...state.stepHistory, 'pack'],
					recoveryAttempts: state.recoveryAttempts + 1,
					metadata: {
						...state.metadata,
						packError: true,
						packErrorTime: Date.now(),
					},
				};
			}
		};
	}

	private createErrorNode() {
		return async (state: ContextGraphState): Promise<Partial<ContextGraphState>> => {
			// Log error and attempt recovery or graceful degradation
			console.error(`brAInwav Context Graph Error: ${state.error}`, {
				requestId: state.requestId,
				step: state.currentStep,
				recoveryAttempts: state.recoveryAttempts,
				stepHistory: state.stepHistory,
			});

			return {
				currentStep: 'error',
				metadata: {
					...state.metadata,
					errorLogged: true,
					errorTime: Date.now(),
					brainwavErrorHandled: true,
				},
			};
		};
	}

	// Conditional edge functions
	private shouldProceedToPlan(state: ContextGraphState): string {
		if (state.error && state.recoveryAttempts < 3) return 'error';
		if (state.error) return 'end';
		if (!state.subgraph || state.subgraph.nodes.length === 0) return 'error';
		return 'plan';
	}

	private shouldProceedToExecute(state: ContextGraphState): string {
		if (state.error && state.recoveryAttempts < 3) return 'error';
		if (state.error) return 'end';
		if (!state.metadata.plan) return 'error';
		return 'execute';
	}

	private shouldProceedToPack(state: ContextGraphState): string {
		if (state.error && state.recoveryAttempts < 3) return 'error';
		if (state.error) return 'end';
		if (!state.modelResponse) return 'error';
		return 'pack';
	}

	private shouldEnd(state: ContextGraphState): string {
		if (state.error) return 'error';
		return 'end';
	}

	private shouldRecover(state: ContextGraphState): string {
		if (state.recoveryAttempts >= 3) return 'end';

		// Simple recovery strategy: retry from the failed step
		const lastStep = state.stepHistory[state.stepHistory.length - 1];
		if (lastStep === 'pack' && state.subgraph) return 'pack';
		if (lastStep === 'execute' && state.subgraph) return 'execute';
		if (lastStep === 'plan' && state.subgraph) return 'plan';
		return 'slice';
	}

	// Helper methods
	private async createExecutionPlan(state: ContextGraphState): Promise<any> {
		return {
			steps: ['slice', 'plan', 'execute', 'pack'],
			contextSize: state.subgraph.nodes.length,
			modelRequirements: {
				tokens: this.estimateTokens(JSON.stringify(state.subgraph)),
				privacy: state.privacyMode,
				evidence: state.evidenceRequired,
			},
			thermalConstraints: state.thermalConstraints,
			estimatedDuration: 5000,
			brainwavGenerated: true,
		};
	}

	private generatePrompt(state: ContextGraphState): string {
		const contextSummary = state.subgraph.nodes
			.map((node) => `Node: ${node.label}\nContent: ${node.content.substring(0, 200)}...`)
			.join('\n\n');

		return `Based on the following context, please provide a comprehensive response:\n\n${contextSummary}\n\nQuestion: ${state.query}`;
	}

	private estimateTokens(text: string): number {
		return Math.ceil(text.length / 4);
	}

	private createErrorState(
		initialState: Partial<ContextGraphState>,
		error: string,
	): ContextGraphState {
		return {
			query: initialState.query || '',
			currentStep: 'error',
			error,
			stepHistory: [],
			tokensUsed: 0,
			costAccrued: 0,
			recoveryAttempts: 0,
			metadata: {
				...initialState.metadata,
				errorTime: Date.now(),
				brainwavErrorHandled: true,
			},
			brainwavGenerated: true,
			brainwavThermalManaged: false,
		};
	}
}

export function createContextGraph(config: ContextGraphConfig): ContextGraphOrchestrator {
	return new ContextGraphOrchestrator(config);
}
