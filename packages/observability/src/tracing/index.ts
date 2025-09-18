/**
 * @fileoverview OTEL tracing with ULID propagation
 */

import { SpanKind, SpanStatusCode, trace } from '@opentelemetry/api';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import type { MetricReader } from '@opentelemetry/sdk-metrics';
import { ConsoleMetricExporter, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { ConsoleSpanExporter, type SpanExporter } from '@opentelemetry/sdk-trace-base';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { generateRunId, type TraceContext, type ULID } from '../index.js';

const tracer = trace.getTracer('@cortex-os/observability');
// Track runIds by spanId since OTEL API does not expose a getAttributes() helper
const spanRunId = new Map<string, string>();

function createTraceExporter(): SpanExporter {
	switch (process.env.TRACE_EXPORTER) {
		case 'jaeger':
			return new JaegerExporter();
		case 'console':
			return new ConsoleSpanExporter();
		default:
			return new OTLPTraceExporter();
	}
}

function createMetricReader(): MetricReader {
	const exporter =
		process.env.METRIC_EXPORTER === 'console'
			? new ConsoleMetricExporter()
			: new OTLPMetricExporter();
	return new PeriodicExportingMetricReader({ exporter });
}

/**
 * Initialize OTEL tracing and metrics
 */
export function initializeObservability(serviceName: string, version: string = '1.0.0'): NodeSDK {
	const sdk = new NodeSDK({
		resource: resourceFromAttributes({
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
export function startConsoleViewer(serviceName: string, version: string = '1.0.0'): NodeSDK {
	process.env.TRACE_EXPORTER = 'console';
	process.env.METRIC_EXPORTER = 'console';
	return initializeObservability(serviceName, version);
}

/**
 * Create a new span with ULID context
 */
export async function withSpan<T>(
	name: string,
	fn: (runId: ULID, traceContext: TraceContext) => Promise<T>,
	options?: {
		runId?: ULID;
		kind?: SpanKind;
		attributes?: Record<string, string | number | boolean>;
	},
): Promise<T> {
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
			const spanId = span.spanContext().spanId;
			const traceContext: TraceContext = {
				runId,
				traceId: span.spanContext().traceId,
				spanId,
			};

			// Cache runId for reverse lookup
			spanRunId.set(spanId, runId);

			try {
				const result = await fn(runId, traceContext);
				span.setStatus({ code: SpanStatusCode.OK });
				return result;
			} catch (error) {
				span.setStatus({
					code: SpanStatusCode.ERROR,
					message: error instanceof Error ? error.message : String(error),
				});
				span.recordException(error instanceof Error ? error : new Error(String(error)));
				throw error;
			} finally {
				try {
					span.end();
				} finally {
					spanRunId.delete(spanId);
				}
			}
		},
	);
}

/**
 * Add ULID to active span
 */
export function addRunIdToSpan(runId: ULID): void {
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
export function getCurrentTraceContext(): TraceContext | null {
	const span = trace.getActiveSpan();
	if (!span) return null;

	const runId = spanRunId.get(span.spanContext().spanId);
	if (!runId) return null;

	return {
		runId: runId,
		traceId: span.spanContext().traceId,
		spanId: span.spanContext().spanId,
	};
}
