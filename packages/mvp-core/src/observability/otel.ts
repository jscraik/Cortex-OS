import { trace, context, SpanStatusCode } from '@opentelemetry/api';

export function withSpan<T>(name: string, f: () => Promise<T>) {
  const tracer = trace.getTracer('cortex-os');
  return tracer.startActiveSpan(
    name,
    async (span) => {
      try {
        const res = await f();
        span.setStatus({ code: SpanStatusCode.OK });
        return res;
      } catch (e: any) {
        span.recordException(e);
        span.setStatus({ code: SpanStatusCode.ERROR, message: e?.message });
        throw e;
      } finally {
        span.end();
      }
    },
    context.active(),
  );
}
