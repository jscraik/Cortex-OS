import { trace } from '@opentelemetry/api';

export const tracer = trace.getTracer('@cortex-os/memories');

export async function withSpan<T>(name: string, fn: () => Promise<T>): Promise<T> {
  return tracer.startActiveSpan(name, async (span) => {
    try {
      const res = await fn();
      span.end();
      return res;
    } catch (err: any) {
      span.recordException(err);
      span.end();
      throw err;
    }
  });
}
