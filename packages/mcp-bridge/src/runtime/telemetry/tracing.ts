import {
	context,
	DiagConsoleLogger,
	DiagLogLevel,
	diag,
	type Span,
	type SpanAttributes,
	SpanKind,
	SpanStatusCode,
	trace,
} from '@opentelemetry/api';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

let sdk: NodeSDK | null = null;

const shouldStartTracing = () => {
	return Boolean(
		process.env.OTEL_EXPORTER_OTLP_ENDPOINT || process.env.MCP_TRACE_EXPORTER === 'otlp',
	);
};

const createSdk = (brandPrefix: string) => {
	const exporter = new OTLPTraceExporter({
		url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
	});

	return new NodeSDK({
		resource: resourceFromAttributes({
			[SemanticResourceAttributes.SERVICE_NAME]: 'brainwav-cortex-mcp',
			[SemanticResourceAttributes.SERVICE_NAMESPACE]: brandPrefix,
			[SemanticResourceAttributes.SERVICE_INSTANCE_ID]: String(process.pid),
		}),
		traceExporter: exporter,
	});
};

export const initializeTracing = (brandPrefix: string): Promise<void> => {
	if (sdk) {
		return Promise.resolve();
	}

	if (!shouldStartTracing()) {
		return Promise.resolve();
	}

	diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ERROR);
	sdk = createSdk(brandPrefix);

	try {
		sdk.start();
	} catch (error) {
		diag.error('Failed to initialise OpenTelemetry', error);
		sdk = null;
	}

	return Promise.resolve();
};

export const shutdownTracing = async () => {
	if (!sdk) {
		return;
	}

	await sdk.shutdown().catch((error) => {
		diag.error('Failed to shutdown OpenTelemetry', error);
	});
	sdk = null;
};

export const withSpan = async <T>(
	name: string,
	attributes: SpanAttributes,
	fn: (span: Span) => Promise<T> | T,
): Promise<T> => {
	const tracer = trace.getTracer('brainwav-cortex-mcp');
	const span = tracer.startSpan(name, {
		attributes,
		kind: SpanKind.INTERNAL,
	});

	const run = async () => fn(span);

	try {
		const result = await context.with(trace.setSpan(context.active(), span), run);
		return result;
	} catch (error) {
		span.recordException(error as Error);
		span.setStatus({ code: SpanStatusCode.ERROR });
		throw error;
	} finally {
		span.end();
	}
};
