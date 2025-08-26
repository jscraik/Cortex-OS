import { context, trace, SpanStatusCode } from "@opentelemetry/api";

export const tracer = trace.getTracer("@cortex-os/agents");

export async function withSpan<T>(
  name: string,
  fn: () => Promise<T>,
  attrs?: Record<string, unknown>
): Promise<T> {
  const span = tracer.startSpan(name, undefined, context.active());
  if (attrs) span.setAttributes(attrs as any);
  try {
    const res = await fn();
    span.setStatus({ code: SpanStatusCode.OK });
    return res;
  } catch (err: any) {
    span.setStatus({ code: SpanStatusCode.ERROR, message: String(err?.message ?? err) });
    throw err;
  } finally {
    span.end();
  }
}

