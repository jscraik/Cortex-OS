import type { Handler } from '@cortex-os/a2a-core/bus';
import { tracer } from '@cortex-os/telemetry';

export function withOtel(handler: Handler): Handler {
  return {
    type: handler.type,
    handle: async (m) => {
      const span = tracer.startSpan(`a2a.handle:${handler.type}`);
      try {
        await handler.handle(m);
        span.setStatus({ code: 1 });
      } catch (e: any) {
        span.recordException(e);
        span.setStatus({ code: 2, message: e?.message });
        throw e;
      } finally {
        span.end();
      }
    },
  };
}
