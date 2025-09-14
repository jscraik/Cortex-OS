import type { Neuron } from '@cortex-os/prp-runner';
import type { Logger } from 'winston';
import type { PRPEngine } from './prp-integration.js';
import { cleanup, createEngine, orchestrateTask } from './prp-integration.js';
import type {
	Agent,
	OrchestrationConfig,
	PlanningContext,
	Task,
} from './types.js';

export interface OrchestrationFacade {
	engine: PRPEngine;
	run: (
		task: Task,
		agents: Agent[],
		context?: Partial<PlanningContext>,
		neurons?: Neuron[],
	) => Promise<unknown>;
	shutdown: () => Promise<void>;
}

export function provideOrchestration(
	config: Partial<OrchestrationConfig> = {},
	logger?: Logger,
): OrchestrationFacade {
	const engine: PRPEngine = createEngine(config, logger);

	return {
		engine,
		run: (
			task: Task,
			agents: Agent[],
			context: Partial<PlanningContext> = {},
			neurons: Neuron[] = [],
		) => orchestrateTask(engine, task, agents, context, neurons),
		shutdown: async () => {
			await cleanup(engine);
		},
	};
}
