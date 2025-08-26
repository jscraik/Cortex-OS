import { tracer } from '@cortex-os/telemetry';

export function provideOrchestration() {
  const span = tracer.startSpan('orchestration.init');
  span.end();
  return {
    run: async (flow: string) => flow,
  };
}
