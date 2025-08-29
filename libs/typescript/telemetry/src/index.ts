/**
 * @file OpenTelemetry Telemetry Implementation
 * @description Production-ready telemetry with tracing, metrics, and logging.
 */

import {
  trace,
  metrics,
  Span,
  SpanStatusCode,
  Context,
  SpanContext,
  TraceFlags,
  createTraceState,
} from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';

// Type aliases for better code reuse
export type SpanAttributes = Record<string, string | number | boolean>;
export type LogAttributes = Record<string, string | number | boolean>;

// Initialize SDK
const sdk = new NodeSDK({
  traceExporter: new JaegerExporter({
    endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
  }),
  metricReader: new PrometheusExporter({
    port: parseInt(process.env.PROMETHEUS_PORT || '9464', 10),
  }),
});

// Start SDK and surface any startup issues
try {
  sdk.start();
} catch (err) {
  // eslint-disable-next-line no-console
  console.error('Telemetry start error', err);
}

// Export configured instances
export const tracer = trace.getTracer('cortex-os', '1.0.0');
export const meter = metrics.getMeter('cortex-os', '1.0.0');

/**
 * Higher-order function to wrap operations with tracing
 */
export async function withSpan<T>(
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

  return tracer.startActiveSpan(
    name,
    spanOptions,
    options?.parentContext,
    async (span) => {
      try {
        const result = await fn(span);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
      } finally {
        span.end();
      }
    },
  );
}

/**
 * Create a child span within an existing context
 */
export function createChildSpan(
  name: string,
  parentContext?: Context,
  attributes?: SpanAttributes,
): Span {
  return tracer.startSpan(name, { attributes: attributes ?? {} }, parentContext);
}

/**
 * Extract span context from headers (for distributed tracing)
 */
export function extractSpanContext(headers: Record<string, string>): SpanContext | undefined {
  const traceParent = headers['traceparent'];
  const traceState = headers['tracestate'];

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
    traceFlags: flags & TraceFlags.SAMPLED ? TraceFlags.SAMPLED : TraceFlags.NONE,
    isRemote: true,
    traceState: traceState ? createTraceState(traceState) : undefined,
  };
}

/**
 * Inject span context into headers (for distributed tracing)
 */
export function injectSpanContext(span: Span, headers: Record<string, string>): void {
  const spanContext = span.spanContext();
  const traceParent = `00-${spanContext.traceId}-${spanContext.spanId}-${spanContext.traceFlags.toString(16).padStart(2, '0')}`;
  headers['traceparent'] = traceParent;

  if (spanContext.traceState) {
    headers['tracestate'] = spanContext.traceState.serialize();
  }
}

/**
 * Create a counter metric
 */
export function createCounter(name: string, description?: string, unit?: string) {
  return meter.createCounter(name, { description, unit });
}

/**
 * Create a histogram metric
 */
export function createHistogram(name: string, description?: string, unit?: string) {
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

  // eslint-disable-next-line no-console
  console[level](message, logAttributes);
}

