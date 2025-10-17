import { context, SpanStatusCode, trace } from '@opentelemetry/api';

export function withSpan<T>(name: string, f: () => Promise<T>) {
        const tracer = trace.getTracer('cortex-os');
        return tracer.startActiveSpan(
                name,
                async (span) => {
                        try {
                                const res = await f();
                                span.setStatus({ code: SpanStatusCode.OK });
                                return res;
                        } catch (e: unknown) {
                                const message = e instanceof Error ? e.message : String(e);
                                span.recordException(e instanceof Error ? e : new Error(message));
                                span.setStatus({ code: SpanStatusCode.ERROR, message });
                                throw e;
                        } finally {
                                span.end();
                        }
                },
                context.active(),
	);
}
