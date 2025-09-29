import { randomUUID } from 'node:crypto';
import {
	AdaptiveCoordinationManager,
	type CoordinationRequest,
	type CoordinationResult,
} from '../coordinator/adaptive-coordinator.js';
import {
	createLongHorizonPlanner,
	type LongHorizonPlanner,
	type LongHorizonTask,
	type PlanningResult,
} from '../lib/long-horizon-planner.js';
import { type Agent, AgentRole } from '../types.js';
import type { PlanningContext } from '../utils/dsp.js';
import { createCerebrumGraph } from './create-cerebrum-graph.js';
import { createInitialN0State, mergeN0State, type N0Session, type N0State } from './n0-state.js';

export interface ExecutePlannedWorkflowOptions {
	input: string;
	task: Partial<LongHorizonTask> & Pick<LongHorizonTask, 'description'>;
	agents?: Agent[];
	session?: Partial<N0Session>;
	planner?: LongHorizonPlanner;
	coordinationManager?: AdaptiveCoordinationManager;
	clock?: () => Date;
}

export interface PlannedWorkflowResult {
	output?: string;
	planningResult: PlanningResult;
	coordinationResult: CoordinationResult;
	stateTransitions: Array<{
		phase: string;
		status: 'completed' | 'failed';
		duration: number;
	}>;
	state: N0State;
}

const DEFAULT_SESSION: N0Session = {
	id: 'brAInwav-session',
	model: 'unknown',
	user: 'system',
	cwd: '/workspace',
	brainwavSession: 'planning-orchestrator',
};

export async function executePlannedWorkflow(
	options: ExecutePlannedWorkflowOptions,
): Promise<PlannedWorkflowResult> {
	const clock = options.clock ?? (() => new Date());
	const planner = options.planner ?? createLongHorizonPlanner();
	const coordinationManager =
		options.coordinationManager ?? new AdaptiveCoordinationManager({ maxHistorySize: 25 });
	const agents: Agent[] = options.agents ?? [
		createDefaultAgent('brAInwav.agent.primary', AgentRole.COORDINATOR, ['analysis', 'execution']),
		createDefaultAgent('brAInwav.agent.support', AgentRole.SPECIALIST, ['review', 'validation']),
	];

	const task = normalizeTask(options.task);
	const planningResult = await planner.planAndExecute(task, async (phase, context) => {
		return buildPhaseSummary(phase, context, clock);
	});

	const coordinationRequest: CoordinationRequest = {
		task,
		availableAgents: agents,
		planningResult,
		context: planner.getCurrentContext(),
		constraints: {
			maxDuration: task.estimatedDuration ?? 60_000,
			maxAgents: Math.max(1, agents.length),
			requiredCapabilities: gatherCapabilities(task),
		},
	};

	const coordinationResult = await coordinationManager.coordinate(coordinationRequest);

	const graph = createCerebrumGraph();
	const graphState = await graph.invoke({
		input: options.input,
		planning: {
			taskId: task.id,
			phases: planningResult.phases.map((phase) => ({
				phase: phase.phase,
				duration: phase.duration,
				status: phase.error ? 'failed' : 'completed',
			})),
			recommendations: planningResult.recommendations,
		},
		coordination: {
			strategy: coordinationResult.strategy,
			assignments: projectAssignments(coordinationResult.assignments),
			confidence: coordinationResult.confidence,
		},
	});

	const stateTransitions = planningResult.phases.map((phase) => ({
		phase: phase.phase,
		status: phase.error ? ('failed' as const) : ('completed' as const),
		duration: phase.duration,
	}));

	const session = { ...DEFAULT_SESSION, ...options.session };
	const baseState = createInitialN0State(options.input, session);
	const state = mergeN0State(baseState, {
		output: graphState.output,
		ctx: {
			planning: {
				phases: planningResult.phases,
				recommendations: planningResult.recommendations,
				success: planningResult.success,
			},
			coordination: {
				strategy: coordinationResult.strategy,
				assignments: projectAssignments(coordinationResult.assignments),
				confidence: coordinationResult.confidence,
			},
			telemetry: coordinationResult.telemetry,
		},
	});

	return {
		output: graphState.output,
		planningResult,
		coordinationResult,
		stateTransitions,
		state,
	};
}

function normalizeTask(task: ExecutePlannedWorkflowOptions['task']): LongHorizonTask {
	return {
		id: task.id ?? randomUUID(),
		description: task.description,
		complexity: task.complexity ?? 5,
		priority: task.priority ?? 5,
		estimatedDuration: task.estimatedDuration ?? 60_000,
		dependencies: task.dependencies ?? [],
		metadata: task.metadata ?? {},
	};
}

function gatherCapabilities(task: LongHorizonTask): string[] {
	if (!task.metadata) {
		return [];
	}
	const caps = task.metadata.capabilities;
	return Array.isArray(caps) ? caps.filter((cap): cap is string => typeof cap === 'string') : [];
}

function buildPhaseSummary(phase: string, context: PlanningContext, clock: () => Date) {
	return {
		phase,
		contextId: context.id,
		stepCount: context.steps.length,
		historyCount: context.history.length,
		timestamp: clock().toISOString(),
	};
}

function createDefaultAgent(id: string, role: AgentRole, capabilities: string[]): Agent {
	return {
		id,
		name: id,
		role,
		capabilities,
		status: 'available',
		metadata: {
			brAInwavManaged: true,
			createdBy: 'brAInwav',
		},
		lastSeen: new Date(),
	};
}

function projectAssignments(
	assignments: CoordinationResult['assignments'],
): Array<{ agentId: string; role: string; weight: number }> {
	if (assignments.length === 0) {
		return [];
	}

	const weight = Number((1 / assignments.length).toFixed(2));
	return assignments.map((assignment) => ({
		agentId: assignment.agentId,
		role: assignment.role,
		weight,
	}));
}
