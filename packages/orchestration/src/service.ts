import type { Neuron } from '@cortex-os/prp-runner';
import { tracer } from '@cortex-os/telemetry';
import type { Logger } from 'winston';
import { createEngine, orchestrateTask } from './prp-integration.js';
import type { Agent, PlanningContext, Task } from './types.js';

export function provideOrchestration(logger?: Logger) {
	const span = tracer.startSpan('orchestration.init');
	const engine = createEngine({}, logger);
	span.end();
	return {
		engine,
		run: (
			task: Task,
			agents: Agent[],
			context: Partial<PlanningContext> = {},
			neurons: Neuron[] = [],
		) => orchestrateTask(engine, task, agents, context, neurons),
	};
}
