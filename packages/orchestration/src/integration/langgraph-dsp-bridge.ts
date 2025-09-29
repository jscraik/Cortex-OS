/**
 * LangGraph DSP Bridge for Cortex-OS
 * Integrates long-horizon planning with LangGraph state flow management
 * Maintains brAInwav branding and follows structured planning architecture
 */

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
				...workflowState.context.metadata,
				planningCompleted: true,
				planningSuccess: planningResult.success,
			};
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
			availableAgents: agents,
			constraints,
			context: this.config.enableContextPropagation ? workflowState.context : undefined,
		};

		// Execute coordination
		const coordinationResult = await this.coordinationManager.coordinate(coordinationRequest);

		// Create state node for coordination
		const nodeId = `coordination-${coordinationResult.strategy}-${Date.now()}`;
		const stateNode: LangGraphStateNode = {
			id: nodeId,
			type: 'coordination',
			strategy: coordinationResult.strategy,
			context: {
				strategy: coordinationResult.strategy,
				assignments: coordinationResult.assignments.length,
				estimatedDuration: coordinationResult.estimatedDuration,
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
				coordinationStrategy: coordinationResult.strategy,
				integrationValid: true,
			},
			timestamp: new Date(),
			brainwavManaged: true,
		};

		workflowState.nodes.set(nodeId, stateNode);

		// Validate consistency
		const validationChecks = {
			planningCompleted: planningResult.phases.length > 0,
			coordinationExecuted: coordinationResult.assignments.length > 0,
			contextFlow: workflowState.context.metadata.planningCompleted === true,
			stateConsistency: workflowState.nodes.size > 1,
		};

		const allValid = Object.values(validationChecks).every((check) => check);

		stateNode.context = {
			...stateNode.context,
			validationChecks,
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
			workspaceId: `workflow-${workflowId}`,
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
		};

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
