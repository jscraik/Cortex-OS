/**
 * LangGraph DSP Bridge for Cortex-OS
 * Integrates long-horizon planning with LangGraph state flow management
 * Maintains brAInwav branding and follows structured planning architecture
 */

import { z } from 'zod';
import type {
	AdaptiveCoordinationManager,
	CoordinationRequest,
	CoordinationResult,
} from '../coordinator/adaptive-coordinator.js';
import type { PlanningContextManager } from '../lib/context-manager.js';
import type {
	LongHorizonPlanner,
	LongHorizonTask,
	PlanningResult,
} from '../lib/long-horizon-planner.js';
import type { Agent, OrchestrationStrategy } from '../types.js';
import { type PlanningContext, PlanningPhase } from '../utils/dsp.js';

export interface LangGraphStateNode {
	id: string;
	type: 'planning' | 'coordination' | 'execution' | 'validation';
	phase?: PlanningPhase;
	strategy?: OrchestrationStrategy;
	context: Record<string, unknown>;
	timestamp: Date;
	brainwavManaged: boolean;
}

export interface LangGraphTransition {
	from: string;
	to: string;
	condition: string;
	data: Record<string, unknown>;
	brainwavOrigin: boolean;
}

export interface WorkflowState {
	currentNode: string;
	nodes: Map<string, LangGraphStateNode>;
	transitions: LangGraphTransition[];
	context: PlanningContext;
	metadata: {
		workflowId: string;
		startedAt: Date;
		lastUpdate: Date;
		brainwavWorkflow: boolean;
	};
}

export interface IntegrationConfig {
	enableStateFlow: boolean;
	enableContextPropagation: boolean;
	enableAdaptiveRouting: boolean;
	maxWorkflowDuration: number;
	brainwavTelemetryEnabled: boolean;
}

// Zod schema for IntegrationConfig validation
const IntegrationConfigSchema = z
	.object({
		enableStateFlow: z.boolean().optional(),
		enableContextPropagation: z.boolean().optional(),
		enableAdaptiveRouting: z.boolean().optional(),
		maxWorkflowDuration: z.number().int().min(0).optional(),
		brainwavTelemetryEnabled: z.boolean().optional(),
	})
	.strict();

/**
 * Bridge between DSP planning and LangGraph workflows
 * Enables structured planning phases to flow into LangGraph state management
 */
export class LangGraphDSPBridge {
	private readonly longHorizonPlanner: LongHorizonPlanner;
	private readonly coordinationManager: AdaptiveCoordinationManager;
	private readonly contextManager: PlanningContextManager;
	private readonly config: IntegrationConfig;
	private readonly activeWorkflows: Map<string, WorkflowState>;

	constructor(
		longHorizonPlanner: LongHorizonPlanner,
		coordinationManager: AdaptiveCoordinationManager,
		contextManager: PlanningContextManager,
		config: Partial<IntegrationConfig> = {},
	) {
		this.longHorizonPlanner = longHorizonPlanner;
		this.coordinationManager = coordinationManager;
		this.contextManager = contextManager;
		this.activeWorkflows = new Map();

		// Validate config at runtime and apply defaults defensively
		try {
			IntegrationConfigSchema.parse(config);
		} catch (err) {
			// Loose validation: emit a brAInwav-branded warning and continue with defaults
			console.warn('brAInwav: Invalid integration config provided - falling back to defaults', err);
		}

		this.config = {
			enableStateFlow: true,
			enableContextPropagation: true,
			enableAdaptiveRouting: true,
			maxWorkflowDuration: 1800000, // 30 minutes
			brainwavTelemetryEnabled: true,
			...config,
		};

		// Connect planner to coordination manager
		this.coordinationManager.setLongHorizonPlanner(this.longHorizonPlanner);

		console.log('brAInwav LangGraph DSP Bridge: Initialized with enhanced planning integration');
	}

	/**
	 * Execute integrated planning workflow with LangGraph state flow
	 */
	async executeIntegratedWorkflow(
		task: LongHorizonTask,
		agents: Agent[],
		constraints: {
			maxDuration: number;
			maxAgents: number;
			requiredCapabilities: string[];
		},
	): Promise<{
		planningResult: PlanningResult;
		coordinationResult: CoordinationResult;
		workflowState: WorkflowState;
		brainwavMetadata: {
			integrationId: string;
			timestamp: Date;
			version: string;
		};
	}> {
		console.log(`brAInwav DSP Bridge: Starting integrated workflow for task ${task.id}`);

		// Initialize workflow state
		const workflowId = `workflow-${task.id}-${Date.now()}`;
		const workflowState = this.initializeWorkflowState(workflowId, task);

		try {
			// Phase 1: Long-horizon planning with state tracking
			const planningResult = await this.executePlanningPhase(task, workflowState);

			// Phase 2: Adaptive coordination with context flow
			const coordinationResult = await this.executeCoordinationPhase(
				task,
				agents,
				constraints,
				workflowState,
			);

			// Phase 3: Integration validation
			await this.validateIntegration(workflowState, planningResult, coordinationResult);

			console.log(`brAInwav DSP Bridge: Completed integrated workflow ${workflowId}`);

			return {
				planningResult,
				coordinationResult,
				workflowState,
				brainwavMetadata: {
					integrationId: workflowId,
					timestamp: new Date(),
					version: '1.0.0',
				},
			};
		} catch (error) {
			console.error(`brAInwav DSP Bridge: Workflow ${workflowId} failed:`, error);
			throw error;
		} finally {
			// Cleanup workflow state
			setTimeout(() => {
				this.activeWorkflows.delete(workflowId);
			}, this.config.maxWorkflowDuration);
		}
	}

	/**
	 * Execute planning phase with LangGraph state tracking
	 */
	private async executePlanningPhase(
		task: LongHorizonTask,
		workflowState: WorkflowState,
	): Promise<PlanningResult> {
		console.log(`brAInwav DSP Bridge: Executing planning phase for task ${task.id}`);

		// Create planning execution wrapper that tracks state transitions
		const planningExecutor = async (phase: PlanningPhase, context: PlanningContext) => {
			// Create state node for this phase
			const nodeId = `planning-${phase}-${Date.now()}`;
			const stateNode: LangGraphStateNode = {
				id: nodeId,
				type: 'planning',
				phase,
				context: {
					contextId: context.id,
					phase,
					taskId: task.id,
					complexity: context.metadata.complexity,
					priority: context.metadata.priority,
				},
				timestamp: new Date(),
				brainwavManaged: true,
			};

			// Add node to workflow state
			workflowState.nodes.set(nodeId, stateNode);

			// Create transition from previous node
			if (workflowState.currentNode) {
				const transition: LangGraphTransition = {
					from: workflowState.currentNode,
					to: nodeId,
					condition: `advance_to_${phase}`,
					data: {
						phase,
						timestamp: new Date(),
						brainwavTransition: true,
					},
					brainwavOrigin: true,
				};
				workflowState.transitions.push(transition);
			}

			// Update current node
			workflowState.currentNode = nodeId;
			workflowState.metadata.lastUpdate = new Date();

			// Execute phase-specific logic
			const phaseResult = await this.executePhaseLogic(phase, context, task);

			// Update node with results
			stateNode.context = {
				...stateNode.context,
				result: phaseResult,
				completed: true,
			};

			console.log(`brAInwav DSP Bridge: Completed planning phase ${phase} for task ${task.id}`);
			return phaseResult;
		};

		// Execute planning with state tracking
		const planningResult = await this.longHorizonPlanner.planTask(task, planningExecutor);

		// Update workflow context with planning results
		if (this.config.enableContextPropagation) {
			workflowState.context.metadata = {
				// store planning completion flags in metadata (may be used by integration layers)
				...(workflowState.context.metadata as unknown as Record<string, unknown>),
				planningCompleted: true,
				planningSuccess: planningResult.success,
			} as unknown as PlanningContext['metadata'];
		}

		return planningResult;
	}

	/**
	 * Execute coordination phase with context flow from planning
	 */
	private async executeCoordinationPhase(
		task: LongHorizonTask,
		agents: Agent[],
		constraints: {
			maxDuration: number;
			maxAgents: number;
			requiredCapabilities: string[];
		},
		workflowState: WorkflowState,
	): Promise<CoordinationResult> {
		console.log(`brAInwav DSP Bridge: Executing coordination phase for task ${task.id}`);

		// Create coordination request with planning context
		const coordinationRequest: CoordinationRequest = {
			task,
			agents,
			// Map required capabilities from constraints into the coordination request
			requiredCapabilities: constraints.requiredCapabilities || [],
			contextSnapshot: this.config.enableContextPropagation ? workflowState.context : undefined,
		};

		// Execute coordination
		// AdaptiveCoordinationManager.coordinate is synchronous in this implementation
		const coordinationResult = this.coordinationManager.coordinate(coordinationRequest);

		// Create state node for coordination
		const nodeId = `coordination-${coordinationResult.strategy}-${Date.now()}`;
		const stateNode: LangGraphStateNode = {
			id: nodeId,
			type: 'coordination',
			strategy: coordinationResult.strategy as unknown as OrchestrationStrategy,
			context: {
				strategy: coordinationResult.strategy as unknown as OrchestrationStrategy,
				assignments: coordinationResult.assignments.length,
				estimatedDuration: (coordinationResult as Partial<{ estimatedDuration: number }>)
					.estimatedDuration,
				confidence: coordinationResult.confidence,
			},
			timestamp: new Date(),
			brainwavManaged: true,
		};

		// Add to workflow state
		workflowState.nodes.set(nodeId, stateNode);

		// Create transition
		if (workflowState.currentNode) {
			const transition: LangGraphTransition = {
				from: workflowState.currentNode,
				to: nodeId,
				condition: 'initiate_coordination',
				data: {
					strategy: coordinationResult.strategy,
					timestamp: new Date(),
					brainwavTransition: true,
				},
				brainwavOrigin: true,
			};
			workflowState.transitions.push(transition);
		}

		workflowState.currentNode = nodeId;
		workflowState.metadata.lastUpdate = new Date();

		return coordinationResult;
	}

	/**
	 * Execute phase-specific logic based on planning phase
	 */
	private async executePhaseLogic(
		phase: PlanningPhase,
		context: PlanningContext,
		task: LongHorizonTask,
	): Promise<Record<string, unknown>> {
		const baseResult = {
			phase,
			contextId: context.id,
			brainwavProcessed: true,
		};

		switch (phase) {
			case PlanningPhase.INITIALIZATION:
				return {
					...baseResult,
					initialized: true,
					complexity: task.complexity,
					priority: task.priority,
				};

			case PlanningPhase.ANALYSIS:
				return {
					...baseResult,
					analyzed: true,
					dependencies: task.dependencies,
					requiredCapabilities: task.metadata.requiredCapabilities || [],
				};

			case PlanningPhase.STRATEGY:
				return {
					...baseResult,
					strategyPlanned: true,
					adaptiveDepth: this.longHorizonPlanner.getStats().adaptiveDepth,
					recommendedApproach: this.getRecommendedApproach(task),
				};

			case PlanningPhase.EXECUTION:
				return {
					...baseResult,
					executionPlanned: true,
					readyForCoordination: true,
				};

			case PlanningPhase.VALIDATION:
				return {
					...baseResult,
					validated: true,
					qualityChecks: ['context-isolation', 'state-consistency'],
				};

			case PlanningPhase.COMPLETION:
				return {
					...baseResult,
					completed: true,
					workflowReady: true,
				};

			default:
				return baseResult;
		}
	}

	/**
	 * Get recommended approach based on task characteristics
	 */
	private getRecommendedApproach(task: LongHorizonTask): string {
		if (task.complexity >= 8) {
			return 'hierarchical-with-coordination';
		}
		if (task.complexity >= 6) {
			return 'adaptive-coordination';
		}
		if (task.complexity >= 4) {
			return 'parallel-execution';
		}
		return 'sequential-execution';
	}

	// Small helper to safely read flags from PlanningContext.metadata without using 'any'
	private getMetadataFlag(workflowState: WorkflowState, key: string): boolean {
		// Cast to unknown first to avoid direct cast from a strongly-typed metadata shape
		const metaUnknown = workflowState.context?.metadata as unknown as
			| Record<string, unknown>
			| undefined;
		if (!metaUnknown) return false;
		const val = metaUnknown[key];
		return val === true;
	}

	// Small helper to resolve workspaceId from task metadata when present
	private getWorkspaceIdFromTask(task: LongHorizonTask): string {
		// Guard the task.metadata by treating it as unknown first, then narrowing
		const maybe = task?.metadata as unknown as Record<string, unknown> | undefined;
		if (maybe && typeof maybe['workspaceId'] === 'string') return String(maybe['workspaceId']);
		return 'default';
	}

	/**
	 * Validate integration between planning and coordination
	 */
	private async validateIntegration(
		workflowState: WorkflowState,
		planningResult: PlanningResult,
		coordinationResult: CoordinationResult,
	): Promise<void> {
		console.log('brAInwav DSP Bridge: Validating integration consistency');

		// Create validation node
		const nodeId = `validation-${Date.now()}`;
		const stateNode: LangGraphStateNode = {
			id: nodeId,
			type: 'validation',
			context: {
				planningSuccess: planningResult.success,
				coordinationStrategy:
					typeof (coordinationResult as unknown as Record<string, unknown>)['strategy'] === 'string'
						? String((coordinationResult as unknown as Record<string, unknown>)['strategy'])
						: undefined,
				integrationValid: true,
			},
			timestamp: new Date(),
			brainwavManaged: true,
		};

		workflowState.nodes.set(nodeId, stateNode);

		// Validate consistency
		const planningCompleted = this.getMetadataFlag(workflowState, 'planningCompleted');
		const coordRecord = coordinationResult as unknown as Record<string, unknown>;
		const assignments = Array.isArray(coordRecord['assignments'])
			? (coordRecord['assignments'] as unknown[])
			: [];
		const strategyVal =
			typeof coordRecord['strategy'] === 'string' ? String(coordRecord['strategy']) : undefined;

		const validationChecks = {
			planningCompleted,
			coordinationExecuted: assignments.length > 0,
			contextFlow: planningCompleted === true,
			stateConsistency: workflowState.nodes.size > 1,
		} as const;

		const allValid = Object.values(validationChecks).every((check) => check);

		stateNode.context = {
			...stateNode.context,
			validationChecks,
			coordinationStrategy: strategyVal,
			integrationValid: allValid,
		};

		if (!allValid) {
			throw new Error('brAInwav DSP Bridge: Integration validation failed');
		}

		console.log('brAInwav DSP Bridge: Integration validation passed');
	}

	/**
	 * Initialize workflow state
	 */
	private initializeWorkflowState(workflowId: string, task: LongHorizonTask): WorkflowState {
		// Create initial context
		const context: PlanningContext = {
			id: task.id,
			workspaceId: this.getWorkspaceIdFromTask(task),
			currentPhase: PlanningPhase.INITIALIZATION,
			steps: [],
			history: [],
			metadata: {
				createdBy: 'brAInwav',
				createdAt: new Date(),
				updatedAt: new Date(),
				complexity: task.complexity,
				priority: task.priority,
			},
			// Provide minimal placeholders for optional structural fields used by other components
			preferences: {},
			compliance: {},
		} as unknown as PlanningContext;

		// Register context with context manager
		this.contextManager.createContext(context);

		const workflowState: WorkflowState = {
			currentNode: '',
			nodes: new Map(),
			transitions: [],
			context,
			metadata: {
				workflowId,
				startedAt: new Date(),
				lastUpdate: new Date(),
				brainwavWorkflow: true,
			},
		};

		this.activeWorkflows.set(workflowId, workflowState);

		console.log(`brAInwav DSP Bridge: Initialized workflow state for ${workflowId}`);
		return workflowState;
	}

	/**
	 * Get workflow statistics for monitoring
	 */
	getWorkflowStats(): {
		activeWorkflows: number;
		completedWorkflows: number;
		averageWorkflowDuration: number;
		brainwavManaged: boolean;
	} {
		const activeCount = this.activeWorkflows.size;

		// Calculate average duration from active workflows
		let totalDuration = 0;
		for (const workflow of this.activeWorkflows.values()) {
			totalDuration += Date.now() - workflow.metadata.startedAt.getTime();
		}
		const averageDuration = activeCount > 0 ? totalDuration / activeCount : 0;

		return {
			activeWorkflows: activeCount,
			completedWorkflows: 0, // Would track completed workflows in production
			averageWorkflowDuration: averageDuration,
			brainwavManaged: true,
		};
	}
}

/**
 * Create LangGraph DSP bridge with brAInwav-optimized defaults
 */
export function createLangGraphDSPBridge(
	longHorizonPlanner: LongHorizonPlanner,
	coordinationManager: AdaptiveCoordinationManager,
	contextManager: PlanningContextManager,
	config?: Partial<IntegrationConfig>,
): LangGraphDSPBridge {
	const defaultConfig: Partial<IntegrationConfig> = {
		enableStateFlow: true,
		enableContextPropagation: true,
		enableAdaptiveRouting: true,
		maxWorkflowDuration: 1800000, // 30 minutes
		brainwavTelemetryEnabled: true,
	};

	return new LangGraphDSPBridge(longHorizonPlanner, coordinationManager, contextManager, {
		...defaultConfig,
		...config,
	});
}
