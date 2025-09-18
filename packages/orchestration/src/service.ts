import type { Logger } from 'winston';
import { createCerebrumGraph } from './langgraph/create-cerebrum-graph.js';
import type {
	Agent,
	OrchestrationConfig,
	PlanningContext,
	Task,
} from './types.js';

export interface OrchestrationFacade {
	engine: { kind: 'langgraph' };
	run: (
		task: Task,
		agents: Agent[],
		context?: Partial<PlanningContext>,
		neurons?: unknown[],
	) => Promise<unknown>;
	shutdown: () => Promise<void>;
}

export function provideOrchestration(
	_config: Partial<OrchestrationConfig> = {},
	_logger?: Logger,
): OrchestrationFacade {
	const engine = { kind: 'langgraph' as const };
	const graph = createCerebrumGraph();

	return {
		engine,
		run: async (
			task: Task,
			_agents: Agent[],
			_context: Partial<PlanningContext> = {},
			_neurons: unknown[] = [],
		) => {
			// Minimal mapping from Task -> graph input for now
			const input = task.title || task.description || 'run';
			const result = await graph.invoke({ input, task: 'default' });
			return result;
		},
		shutdown: async () => {
			// Noop for now (no persistent resources yet)
		},
	};
}
