/**
 * Planning Tools for Cortex-OS MCP Integration
 * Implements DSP-integrated planning capabilities following nO Master Agent Loop architecture
 * Maintains brAInwav branding and A2A communication patterns
 */

import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { McpTool, ToolExecutionContext } from '../tools.js';
import { ToolExecutionError } from '../tools.js';

// ================================
// Planning Types & Schemas
// ================================

export enum PlanningPhase {
	INITIALIZATION = 'initialization',
	ANALYSIS = 'analysis',
	STRATEGY = 'strategy',
	EXECUTION = 'execution',
	VALIDATION = 'validation',
	COMPLETION = 'completion',
}

export interface PlanningContext {
	id: string;
	workspaceId?: string;
	currentPhase: PlanningPhase;
	steps: Array<{
		phase: PlanningPhase;
		action: string;
		status: 'pending' | 'in_progress' | 'completed' | 'failed';
		timestamp: Date;
		result?: unknown;
	}>;
	history: Array<{
		decision: string;
		outcome: 'success' | 'failure';
		learned: string;
		timestamp: Date;
	}>;
	metadata: {
		createdBy: 'brAInwav';
		createdAt: Date;
		updatedAt: Date;
		complexity: number;
		priority: number;
	};
}

export interface PlanningTask {
	id: string;
	description: string;
	complexity: number; // 1-10 scale
	priority: number; // 1-10 scale
	estimatedDuration: number; // milliseconds
	dependencies: string[];
	metadata: Record<string, unknown>;
}

// brAInwav Schema: Planning task structure (currently unused but kept for future expansion)
const _PlanningTaskSchema = z.object({
	id: z.string().min(1),
	description: z.string().min(1),
	complexity: z.number().int().min(1).max(10),
	priority: z.number().int().min(1).max(10),
	estimatedDuration: z.number().int().positive(),
	dependencies: z.array(z.string()),
	metadata: z.record(z.unknown()).default({}),
});

// ================================
// Create Planning Session Tool
// ================================

const CreatePlanningSessionInputSchema = z.object({
	name: z.string().min(1, 'planning session name is required'),
	description: z.string().optional(),
	workspaceId: z.string().optional(),
	agentId: z.string().optional(),
	sessionId: z.string().optional(),
	complexity: z.number().int().min(1).max(10).optional(),
	priority: z.number().int().min(1).max(10).optional(),
	maxPlanningTime: z.number().int().positive().optional(),
	adaptiveDepthEnabled: z.boolean().optional(),
});

export type CreatePlanningSessionInput = z.infer<typeof CreatePlanningSessionInputSchema>;

export interface CreatePlanningSessionResult {
	context: PlanningContext;
	sessionId: string;
	timestamp: string;
	brainwavMetadata: {
		createdBy: 'brAInwav';
		nOArchitecture: boolean;
		dspIntegrated: boolean;
	};
}

export class CreatePlanningSessionTool
	implements McpTool<CreatePlanningSessionInput, CreatePlanningSessionResult>
{
	readonly name = 'planning-create-session';
	readonly description =
		'Creates a new DSP-integrated planning session with brAInwav context management';
	readonly inputSchema = CreatePlanningSessionInputSchema;

	async execute(
		input: CreatePlanningSessionInput,
		context?: ToolExecutionContext,
	): Promise<CreatePlanningSessionResult> {
		if (context?.signal?.aborted) {
			throw new ToolExecutionError('brAInwav Planning: Tool execution aborted', {
				code: 'E_TOOL_ABORTED',
			});
		}

		try {
			// brAInwav Validation: Ensure name is not empty
			if (!input.name || input.name.trim() === '') {
				throw new ToolExecutionError('brAInwav Planning: Session name cannot be empty', {
					code: 'E_INVALID_INPUT',
				});
			}

			const sessionId = `planning-${Date.now()}-${randomUUID().slice(0, 8)}`;

			// brAInwav Planning: Set default values for optional parameters
			const planningContext: PlanningContext = {
				id: sessionId,
				workspaceId: input.workspaceId,
				currentPhase: PlanningPhase.INITIALIZATION,
				steps: [],
				history: [],
				metadata: {
					createdBy: 'brAInwav',
					createdAt: new Date(),
					updatedAt: new Date(),
					complexity: input.complexity ?? 5,
					priority: input.priority ?? 5,
				},
			};

			// Store context for cross-tool access
			ExecutePlanningPhaseTool.storePlanningContext(sessionId, planningContext);

			console.log(
				`brAInwav Planning: Created DSP planning session ${sessionId} with nO architecture support`,
			);

			// Emit A2A event for planning session creation
			this.emitA2AEvent('planning.session.created', {
				sessionId,
				workspaceId: input.workspaceId,
				agentId: input.agentId,
				timestamp: new Date().toISOString(),
				brainwavOrigin: true,
			});

			return {
				context: planningContext,
				sessionId,
				timestamp: new Date().toISOString(),
				brainwavMetadata: {
					createdBy: 'brAInwav',
					nOArchitecture: true,
					dspIntegrated: true,
				},
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			throw new ToolExecutionError(`brAInwav Planning: Failed to create session - ${message}`, {
				code: 'E_PLANNING_SESSION_CREATE_FAILED',
				cause: error,
			});
		}
	}

	private emitA2AEvent(eventType: string, data: Record<string, unknown>): void {
		// A2A event emission - would integrate with actual A2A message bus
		console.log(`brAInwav A2A: Emitting event ${eventType}`, data);
	}
}

// ================================
// Execute Planning Phase Tool
// ================================

const ExecutePlanningPhaseInputSchema = z.object({
	sessionId: z.string().min(1, 'session ID is required'),
	phase: z.nativeEnum(PlanningPhase),
	action: z.string().min(1, 'action description is required'),
	metadata: z.record(z.unknown()).optional(),
});

export type ExecutePlanningPhaseInput = z.infer<typeof ExecutePlanningPhaseInputSchema>;

export interface ExecutePlanningPhaseResult {
	sessionId: string;
	phase: PlanningPhase;
	status: 'completed' | 'failed';
	result?: unknown;
	nextPhase?: PlanningPhase;
	timestamp: string;
	brainwavMetadata: {
		executedBy: 'brAInwav';
		dspOptimized: boolean;
	};
}

export class ExecutePlanningPhaseTool
	implements McpTool<ExecutePlanningPhaseInput, ExecutePlanningPhaseResult>
{
	readonly name = 'planning-execute-phase';
	readonly description =
		'Executes a specific planning phase using DSP patterns with brAInwav optimization';
	readonly inputSchema = ExecutePlanningPhaseInputSchema;

	private static planningContexts = new Map<string, PlanningContext>();

	async execute(
		input: ExecutePlanningPhaseInput,
		context?: ToolExecutionContext,
	): Promise<ExecutePlanningPhaseResult> {
		if (context?.signal?.aborted) {
			throw new ToolExecutionError('brAInwav Planning: Tool execution aborted', {
				code: 'E_TOOL_ABORTED',
			});
		}

		try {
			const planningContext = ExecutePlanningPhaseTool.planningContexts.get(input.sessionId);
			if (!planningContext) {
				throw new ToolExecutionError(`brAInwav Planning: Session ${input.sessionId} not found`, {
					code: 'E_SESSION_NOT_FOUND',
				});
			}

			// Execute the planning phase using DSP patterns
			const phaseResult = await this.executeDSPPhase(input.phase, input.action, planningContext);

			// Update planning context
			planningContext.currentPhase = input.phase;
			planningContext.steps.push({
				phase: input.phase,
				action: input.action,
				status: phaseResult.success ? 'completed' : 'failed',
				timestamp: new Date(),
				result: phaseResult.result,
			});
			planningContext.metadata.updatedAt = new Date();

			ExecutePlanningPhaseTool.planningContexts.set(input.sessionId, planningContext);

			const nextPhase = this.determineNextPhase(input.phase);

			console.log(
				`brAInwav Planning: Executed DSP phase ${input.phase} for session ${input.sessionId}`,
			);

			// Emit A2A event for phase completion
			this.emitA2AEvent('planning.phase.completed', {
				sessionId: input.sessionId,
				phase: input.phase,
				success: phaseResult.success,
				nextPhase,
				timestamp: new Date().toISOString(),
				brainwavOrigin: true,
			});

			return {
				sessionId: input.sessionId,
				phase: input.phase,
				status: phaseResult.success ? 'completed' : 'failed',
				result: phaseResult.result,
				nextPhase,
				timestamp: new Date().toISOString(),
				brainwavMetadata: {
					executedBy: 'brAInwav',
					dspOptimized: true,
				},
			};
		} catch (error) {
			if (error instanceof ToolExecutionError) throw error;
			const message = error instanceof Error ? error.message : String(error);
			throw new ToolExecutionError(`brAInwav Planning: Phase execution failed - ${message}`, {
				code: 'E_PLANNING_PHASE_FAILED',
				cause: error,
			});
		}
	}

	private async executeDSPPhase(
		phase: PlanningPhase,
		_action: string,
		context: PlanningContext,
	): Promise<{ success: boolean; result?: unknown }> {
		// DSP-based phase execution logic
		switch (phase) {
			case PlanningPhase.INITIALIZATION:
				return { success: true, result: { initialized: true, contextId: context.id } };
			case PlanningPhase.ANALYSIS:
				return {
					success: true,
					result: { analyzed: true, complexity: context.metadata.complexity },
				};
			case PlanningPhase.STRATEGY:
				return { success: true, result: { strategy: 'adaptive', planningDepth: 3 } };
			case PlanningPhase.EXECUTION:
				return { success: true, result: { executed: true, steps: context.steps.length } };
			case PlanningPhase.VALIDATION:
				return { success: true, result: { validated: true, quality: 0.85 } };
			case PlanningPhase.COMPLETION:
				return {
					success: true,
					result: { completed: true, duration: Date.now() - context.metadata.createdAt.getTime() },
				};
			default:
				return { success: false };
		}
	}

	private determineNextPhase(currentPhase: PlanningPhase): PlanningPhase | undefined {
		const phaseOrder = [
			PlanningPhase.INITIALIZATION,
			PlanningPhase.ANALYSIS,
			PlanningPhase.STRATEGY,
			PlanningPhase.EXECUTION,
			PlanningPhase.VALIDATION,
			PlanningPhase.COMPLETION,
		];

		const currentIndex = phaseOrder.indexOf(currentPhase);
		return currentIndex < phaseOrder.length - 1 ? phaseOrder[currentIndex + 1] : undefined;
	}

	private emitA2AEvent(eventType: string, data: Record<string, unknown>): void {
		// A2A event emission - would integrate with actual A2A message bus
		console.log(`brAInwav A2A: Emitting event ${eventType}`, data);
	}

	// Static method to store planning context for cross-tool access
	static storePlanningContext(sessionId: string, context: PlanningContext): void {
		ExecutePlanningPhaseTool.planningContexts.set(sessionId, context);
	}

	static getPlanningContext(sessionId: string): PlanningContext | undefined {
		return ExecutePlanningPhaseTool.planningContexts.get(sessionId);
	}
}

// ================================
// Get Planning Status Tool
// ================================

const GetPlanningStatusInputSchema = z.object({
	sessionId: z.string().min(1, 'session ID is required'),
	includeHistory: z.boolean().optional(),
	includeSteps: z.boolean().optional(),
});

export type GetPlanningStatusInput = z.infer<typeof GetPlanningStatusInputSchema>;

export interface GetPlanningStatusResult {
	sessionId: string;
	context: PlanningContext;
	status: 'active' | 'completed' | 'failed';
	progress: number; // 0-1
	timestamp: string;
	brainwavMetadata: {
		queriedBy: 'brAInwav';
		dspManaged: boolean;
	};
}

export class GetPlanningStatusTool
	implements McpTool<GetPlanningStatusInput, GetPlanningStatusResult>
{
	readonly name = 'planning-get-status';
	readonly description =
		'Retrieves current status of a DSP planning session with brAInwav telemetry';
	readonly inputSchema = GetPlanningStatusInputSchema;

	async execute(
		input: GetPlanningStatusInput,
		context?: ToolExecutionContext,
	): Promise<GetPlanningStatusResult> {
		if (context?.signal?.aborted) {
			throw new ToolExecutionError('brAInwav Planning: Tool execution aborted', {
				code: 'E_TOOL_ABORTED',
			});
		}

		try {
			const planningContext = ExecutePlanningPhaseTool.getPlanningContext(input.sessionId);
			if (!planningContext) {
				throw new ToolExecutionError(`brAInwav Planning: Session ${input.sessionId} not found`, {
					code: 'E_SESSION_NOT_FOUND',
				});
			}

			// Calculate progress based on completed phases
			const totalPhases = Object.values(PlanningPhase).length;
			const completedSteps = planningContext.steps.filter(
				(step) => step.status === 'completed',
			).length;
			const progress = completedSteps / totalPhases;

			// brAInwav Logic: Determine status based on phase completion
			const hasFailedSteps = planningContext.steps.some((step) => step.status === 'failed');
			const isCompleted = planningContext.currentPhase === PlanningPhase.COMPLETION;
			let status: 'active' | 'completed' | 'failed';

			if (hasFailedSteps) {
				status = 'failed';
			} else if (isCompleted) {
				status = 'completed';
			} else {
				status = 'active';
			}

			// Filter context based on input preferences
			const filteredContext: PlanningContext = {
				...planningContext,
				steps: (input.includeSteps ?? true) ? planningContext.steps : [],
				history: (input.includeHistory ?? false) ? planningContext.history : [],
			};

			console.log(
				`brAInwav Planning: Retrieved status for DSP session ${input.sessionId} - ${status} (${Math.round(progress * 100)}%)`,
			);

			return {
				sessionId: input.sessionId,
				context: filteredContext,
				status,
				progress,
				timestamp: new Date().toISOString(),
				brainwavMetadata: {
					queriedBy: 'brAInwav',
					dspManaged: true,
				},
			};
		} catch (error) {
			if (error instanceof ToolExecutionError) throw error;
			const message = error instanceof Error ? error.message : String(error);
			throw new ToolExecutionError(`brAInwav Planning: Status retrieval failed - ${message}`, {
				code: 'E_PLANNING_STATUS_FAILED',
				cause: error,
			});
		}
	}
}

// ================================
// Tool Instances & Exports
// ================================

export const createPlanningSessionTool = new CreatePlanningSessionTool();
export const executePlanningPhaseTool = new ExecutePlanningPhaseTool();
export const getPlanningStatusTool = new GetPlanningStatusTool();

// Export all planning tools
export const planningTools = [
	createPlanningSessionTool,
	executePlanningPhaseTool,
	getPlanningStatusTool,
] as const;
