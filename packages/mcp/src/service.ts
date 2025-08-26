import { tracer } from '@cortex-os/telemetry';

export function provideMCP() {
  const span = tracer.startSpan('mcp.init');
  span.end();
  return {
    call: async (name: string, payload: unknown) => ({ name, payload }),
  };
}
