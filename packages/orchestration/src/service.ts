import { tracer } from '@cortex-os/telemetry';
import { PRPOrchestrationEngine } from './prp-integration.js';
import type { Agent, PlanningContext, Task } from './types.js';

export function provideOrchestration() {
  const span = tracer.startSpan('orchestration.init');
  const engine = new PRPOrchestrationEngine();
  span.end();
  return {
    engine,
    run: (task: Task, agents: Agent[], context: Partial<PlanningContext> = {}) =>
      engine.orchestrateTask(task, agents, context),
  };
}
