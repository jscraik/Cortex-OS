import { SpanStatusCode, trace, type Span } from '@opentelemetry/api';

type SpanAttributes = Record<string, unknown>;

type SpanExecutor<T> = (span: Span) => Promise<T> | T;

export async function withRuntimeSpan<T>(
	name: string,
	executor: SpanExecutor<T>,
	attributes: SpanAttributes = {},
): Promise<T> {
	const tracer = trace.getTracer('cortex-os/runtime');

	return tracer.startActiveSpan(name, async (span) => {
		try {
			for (const [key, value] of Object.entries(attributes)) {
				span.setAttribute(key, value as never);
			}
			const result = await executor(span);
			span.setStatus({ code: SpanStatusCode.OK });
			span.end();
			return result;
		} catch (error) {
			span.recordException(error as Error);
			span.setStatus({
				code: SpanStatusCode.ERROR,
				message: error instanceof Error ? error.message : String(error),
			});
			span.end();
			throw error;
		}
	});
}
