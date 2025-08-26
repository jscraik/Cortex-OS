import { tracer } from '@cortex-os/telemetry';

export function provideMemories() {
  const span = tracer.startSpan('memories.init');
  span.end();
  return {
    get: (k: string) => undefined as unknown,
    set: (k: string, v: unknown) => void k && v,
  };
}
