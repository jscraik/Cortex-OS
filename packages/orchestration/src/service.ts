import { tracer } from '@cortex-os/telemetry';
import { createEngine, orchestrateTask } from './prp-integration.js';
import type { Agent, PlanningContext, Task } from './types.js';

export function provideOrchestration() {
  const span = tracer.startSpan('orchestration.init');
  const engine = createEngine();
  span.end();
  return {
    engine,
    run: (
      task: Task,
      agents: Agent[],
      context: Partial<PlanningContext> = {},
      neurons: any[] = [],
    ) => orchestrateTask(engine, task, agents, context, neurons),
  };
}
