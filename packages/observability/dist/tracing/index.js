/**
 * @fileoverview OTEL tracing with ULID propagation
 */
import { SpanKind, SpanStatusCode, trace } from '@opentelemetry/api';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import {
	ConsoleMetricExporter,
	PeriodicExportingMetricReader,
} from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base';
import {
	ATTR_SERVICE_NAME,
	ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';
import { generateRunId } from '../index.js';

const tracer = trace.getTracer('@cortex-os/observability');
function createTraceExporter() {
	switch (process.env.TRACE_EXPORTER) {
		case 'jaeger':
			return new JaegerExporter();
		case 'console':
			return new ConsoleSpanExporter();
		default:
			return new OTLPTraceExporter();
	}
}
function createMetricReader() {
	const exporter =
		process.env.METRIC_EXPORTER === 'console'
			? new ConsoleMetricExporter()
			: new OTLPMetricExporter();
	return new PeriodicExportingMetricReader({ exporter });
}
/**
 * Initialize OTEL tracing and metrics
 */
export function initializeObservability(serviceName, version = '1.0.0') {
	const sdk = new NodeSDK({
		resource: new Resource({
			[ATTR_SERVICE_NAME]: serviceName,
			[ATTR_SERVICE_VERSION]: version,
		}),
		traceExporter: createTraceExporter(),
		metricReader: createMetricReader(),
		instrumentations: [getNodeAutoInstrumentations()],
	});
	sdk.start();
	const shutdown = async () => {
		try {
			await sdk.shutdown();
		} catch (err) {
			console.error('[observability] shutdown error', err);
		}
	};
	process.once('SIGINT', shutdown);
	process.once('SIGTERM', shutdown);
	process.once('beforeExit', shutdown);
	return sdk;
}
// Backwards compatibility
export const initializeTracing = initializeObservability;
/**
 * Start console viewer for traces and metrics
 */
export function startConsoleViewer(serviceName, version = '1.0.0') {
	process.env.TRACE_EXPORTER = 'console';
	process.env.METRIC_EXPORTER = 'console';
	return initializeObservability(serviceName, version);
}
/**
 * Create a new span with ULID context
 */
export async function withSpan(name, fn, options) {
	const runId = options?.runId || generateRunId();
	return tracer.startActiveSpan(
		name,
		{
			kind: options?.kind || SpanKind.INTERNAL,
			attributes: {
				'cortex.run_id': runId,
				...options?.attributes,
			},
		},
		async (span) => {
			const traceContext = {
				runId,
				traceId: span.spanContext().traceId,
				spanId: span.spanContext().spanId,
			};
			try {
				const result = await fn(runId, traceContext);
				span.setStatus({ code: SpanStatusCode.OK });
				return result;
			} catch (error) {
				span.setStatus({
					code: SpanStatusCode.ERROR,
					message: error instanceof Error ? error.message : String(error),
				});
				span.recordException(
					error instanceof Error ? error : new Error(String(error)),
				);
				throw error;
			} finally {
				span.end();
			}
		},
	);
}
/**
 * Add ULID to active span
 */
export function addRunIdToSpan(runId) {
	const span = trace.getActiveSpan();
	if (span) {
		span.setAttributes({
			'cortex.run_id': runId,
		});
	}
}
/**
 * Get current trace context
 */
export function getCurrentTraceContext() {
	const span = trace.getActiveSpan();
	if (!span) return null;
	const runId = span.getAttributes()['cortex.run_id'];
	if (!runId) return null;
	return {
		runId: runId,
		traceId: span.spanContext().traceId,
		spanId: span.spanContext().spanId,
	};
}
//# sourceMappingURL=index.js.map
