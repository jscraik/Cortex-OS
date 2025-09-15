/**
 * @file OpenTelemetry Telemetry Implementation
 * @description Production-ready telemetry with tracing, metrics, and logging.
 */

import {
	type Context,
	createTraceState,
	type Meter,
	metrics,
	type Span,
	type SpanContext,
	SpanStatusCode,
	trace,
	TraceFlags,
	type Tracer,
} from '@opentelemetry/api';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { NodeSDK } from '@opentelemetry/sdk-node';

// Type aliases for better code reuse
export type SpanAttributes = Record<string, string | number | boolean>;
export type LogAttributes = Record<string, string | number | boolean>;

// Initialize SDK
const sdk = new NodeSDK({
	// No explicit trace exporter by default; wire one up in the app if needed.
	metricReader: new PrometheusExporter({
		port: parseInt(process.env.PROMETHEUS_PORT || '9464', 10),
	}),
});

// Start SDK and surface any startup issues
try {
	sdk.start();
} catch (err) {
	console.error(
		'Telemetry start error',
		err instanceof Error ? err.message : err,
	);
}

// Export configured instances
// Defensive wrappers to avoid "error" typed values flagged by eslint when instrumentation overrides types
function safeGetTracer(name: string, version?: string): Tracer {
	try {
		return trace.getTracer(name, version);
	} catch (error) {
		console.warn(
			'[telemetry] tracer acquisition failed, returning noop tracer:',
			error instanceof Error ? error.message : error,
		);
		return trace.getTracer('noop');
	}
}

function safeGetMeter(name: string, version?: string): Meter {
	try {
		return metrics.getMeter(name, version);
	} catch (error) {
		console.warn(
			'[telemetry] meter acquisition failed, returning fallback meter:',
			error instanceof Error ? error.message : error,
		);
		return metrics.getMeter('noop');
	}
}

export const tracer = safeGetTracer('cortex-os', '1.0.0');
export const meter = safeGetMeter('cortex-os', '1.0.0');

// Re-export selected OpenTelemetry enums for convenience
export { SpanStatusCode } from '@opentelemetry/api';

/**
 * Higher-order function to wrap operations with tracing
 */
export function withSpan<T>(
	name: string,
	fn: (span: Span) => Promise<T>,
	options?: {
		attributes?: SpanAttributes;
		links?: Array<{ context: SpanContext; attributes?: SpanAttributes }>;
		parentContext?: Context;
	},
): Promise<T> {
	const spanOptions = {
		attributes: options?.attributes ?? {},
		links: options?.links ?? [],
	};

	return new Promise<T>((resolve, reject) => {
		const run = async (span: Span) => {
			try {
				const result = await fn(span);
				span.setStatus({ code: SpanStatusCode.OK });
				resolve(result);
			} catch (error) {
				const errObj =
					error instanceof Error ? error : new Error(String(error));
				span.recordException(errObj);
				span.setStatus({
					code: SpanStatusCode.ERROR,
					message: errObj.message,
				});
				reject(errObj);
			} finally {
				span.end();
			}
		};

		if (options?.parentContext) {
			tracer.startActiveSpan(
				name,
				spanOptions,
				options.parentContext,
				(span) => {
					void run(span);
				},
			);
		} else {
			tracer.startActiveSpan(name, spanOptions, (span) => {
				void run(span);
			});
		}
	});
}

/**
 * Create a child span within an existing context
 */
export function createChildSpan(
	name: string,
	parentContext?: Context,
	attributes?: SpanAttributes,
): Span {
	return tracer.startSpan(
		name,
		{ attributes: attributes ?? {} },
		parentContext,
	);
}

/**
 * Extract span context from headers (for distributed tracing)
 */
export function extractSpanContext(
	headers: Record<string, string>,
): SpanContext | undefined {
	const traceParent = headers.traceparent;
	const traceState = headers.tracestate;

	if (!traceParent) return undefined;

	// Parse traceparent header: 00-TRACE_ID-SPAN_ID-FLAGS
	const parts = traceParent.split('-');
	if (parts.length !== 4 || parts[0] !== '00') return undefined;

	const traceId = parts[1];
	const spanId = parts[2];
	const flags = parseInt(parts[3], 16);

	return {
		traceId,
		spanId,
		traceFlags:
			flags & TraceFlags.SAMPLED ? TraceFlags.SAMPLED : TraceFlags.NONE,
		isRemote: true,
		traceState: traceState ? createTraceState(traceState) : undefined,
	};
}

/**
 * Inject span context into headers (for distributed tracing)
 */
export function injectSpanContext(
	span: Span,
	headers: Record<string, string>,
): void {
	const spanContext = span.spanContext();
	const traceParent = `00-${spanContext.traceId}-${spanContext.spanId}-${spanContext.traceFlags.toString(16).padStart(2, '0')}`;
	headers.traceparent = traceParent;

	if (spanContext.traceState) {
		headers.tracestate = spanContext.traceState.serialize();
	}
}

/**
 * Create a counter metric
 */
export function createCounter(
	name: string,
	description?: string,
	unit?: string,
) {
	return meter.createCounter(name, { description, unit });
}

/**
 * Create a histogram metric
 */
export function createHistogram(
	name: string,
	description?: string,
	unit?: string,
) {
	return meter.createHistogram(name, { description, unit });
}

/**
 * Create a gauge metric
 */
export function createGauge(name: string, description?: string, unit?: string) {
	return meter.createObservableGauge(name, { description, unit });
}

/**
 * Structured logging with span context
 */
export function logWithSpan(
	level: 'info' | 'warn' | 'error',
	message: string,
	attributes?: LogAttributes,
	span?: Span,
): void {
	const logAttributes: Record<string, unknown> = {
		...attributes,
		timestamp: Date.now(),
	};

	if (span) {
		const spanContext = span.spanContext();
		logAttributes.traceId = spanContext.traceId;
		logAttributes.spanId = spanContext.spanId;
	}

	switch (level) {
		case 'info':
			console.info(message, logAttributes);
			break;
		case 'warn':
			console.warn(message, logAttributes);
			break;
		case 'error':
			console.error(message, logAttributes);
			break;
		default:
			console.log(message, logAttributes);
	}
}

/**
 * Gracefully flush and shutdown the OpenTelemetry SDK.
 * Ensures metrics are exported before process exit. Idempotent & safe.
 */
export async function shutdownTelemetry(options?: {
	timeoutMs?: number;
}): Promise<void> {
	const timeoutMs = options?.timeoutMs ?? 5000;
	// If sdk already shut down, this should resolve quickly.
	let timedOut = false;
	const timer = setTimeout(() => {
		timedOut = true;
		console.warn('[telemetry] shutdown timeout reached');
	}, timeoutMs);
	try {
		await sdk.shutdown();
		if (!timedOut) {
			console.info('[telemetry] shutdown complete');
		}
	} catch (error) {
		console.error(
			'[telemetry] shutdown error',
			error instanceof Error ? error.message : error,
		);
	} finally {
		clearTimeout(timer);
	}
}
