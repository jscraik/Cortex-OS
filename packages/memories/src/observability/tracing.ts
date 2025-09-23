import { SpanStatusCode, trace } from '@opentelemetry/api';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';

// Initialize tracing only if enabled
if (process.env.OTEL_TRACING_ENABLED === 'true') {
	const provider = new NodeTracerProvider();
	provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));
	trace.setGlobalTracerProvider(provider);

	// Auto-instrument common modules
	registerInstrumentations({
		instrumentations: [
			// Add specific instrumentations as needed
		],
	});
}

class ConsoleSpanExporter {
	export(span: any) {
		console.log({
			traceId: span.spanContext().traceId,
			spanId: span.spanContext().spanId,
			name: span.name,
			status: span.status,
			duration: span.duration,
			attributes: span.attributes,
		});
	}

	shutdown() {
		return Promise.resolve();
	}
}

export function traced<T>(
	operationName: string,
	fn: () => Promise<T>,
	attributes?: Record<string, unknown>,
): Promise<T> {
	if (process.env.OTEL_TRACING_ENABLED !== 'true') {
		return fn();
	}

	const tracer = trace.getTracer('memories', '0.1.0');

	return tracer.startActiveSpan(operationName, { attributes }, async (span) => {
		try {
			const result = await fn();
			span.setStatus({ code: SpanStatusCode.OK });
			return result;
		} catch (error) {
			span.setStatus({
				code: SpanStatusCode.ERROR,
				message: error instanceof Error ? error.message : 'Unknown error',
			});
			span.recordException(error instanceof Error ? error : new Error(String(error)));
			throw error;
		} finally {
			span.end();
		}
	});
}

export function createSpan(operationName: string, attributes?: Record<string, unknown>) {
	if (process.env.OTEL_TRACING_ENABLED !== 'true') {
		return {
			end: () => {},
			setAttribute: () => {},
			recordException: () => {},
		};
	}

	const tracer = trace.getTracer('memories', '0.1.0');
	return tracer.startSpan(operationName, { attributes });
}

// Helper for common tracing scenarios
export const tracingHelpers = {
	// For database operations
	db: (operation: string, table: string) => ({
		'db.operation': operation,
		'db.table': table,
		'db.system': 'sqlite',
	}),

	// For HTTP operations
	http: (method: string, url: string, statusCode?: number) => ({
		'http.method': method,
		'http.url': url,
		'http.status_code': statusCode,
	}),

	// For ML operations
	ml: (model: string, operation: string) => ({
		'ml.model': model,
		'ml.operation': operation,
	}),
};
