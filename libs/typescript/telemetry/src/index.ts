/**
 * @file OpenTelemetry Telemetry Implementation
 * @descripexport function withSpan<T>(
  name: string,
  fn: (span: Span) => Promise<T>,
  options?: {
    attributes?: SpanAttributes;
    links?: Array<{ context: SpanContext; attributes?: SpanAttributes }>;
    parentContext?: Context;
  }
): Promise<T> {uction-ready telemetry with tracing, metrics, and logging
 */

import {
  trace,
  metrics,
  logs,
  Span,
  SpanStatusCode,
  Tracer,
  Meter,
  Logger,
  Context,
  SpanContext,
  TraceFlags,
  createTraceState,
  createSpanContext,
} from '@opentelemetry/api';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { MeterProvider } from '@opentelemetry/sdk-metrics';
import {
  LoggerProvider,
  SimpleLogRecordProcessor,
  ConsoleLogRecordExporter,
} from '@opentelemetry/sdk-logs';

// Type aliases for better code reuse
type SpanAttributes = Record<string, string | number | boolean>;
type LogAttributes = Record<string, string | number | boolean>;

// Initialize providers
const tracerProvider = new NodeTracerProvider();
const meterProvider = new MeterProvider();
const loggerProvider = new LoggerProvider();

// Configure Jaeger exporter for traces
const jaegerExporter = new JaegerExporter({
  endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
});

// Configure Prometheus exporter for metrics
const prometheusExporter = new PrometheusExporter({
  port: parseInt(process.env.PROMETHEUS_PORT || '9464'),
});

// Add processors
tracerProvider.addSpanProcessor(new SimpleSpanProcessor(jaegerExporter));
loggerProvider.addLogRecordProcessor(new SimpleLogRecordProcessor(new ConsoleLogRecordExporter()));

// Register providers
tracerProvider.register();
meterProvider.register();
logs.setGlobalLoggerProvider(loggerProvider);

// Export configured instances
export const tracer: Tracer = trace.getTracer('cortex-os', '1.0.0');
export const meter: Meter = metrics.getMeter('cortex-os', '1.0.0');
export const logger: Logger = logs.getLogger('cortex-os', '1.0.0');

/**
 * Higher-order function to wrap operations with tracing
 */
export function withSpan<T>(
  name: string,
  fn: (span: Span) => Promise<T>,
  options?: {
    attributes?: Record<string, string | number | boolean>;
    links?: Array<{ context: SpanContext; attributes?: Record<string, string> }>;
    parentContext?: Context;
  },
): Promise<T> {
  const spanOptions = {
    attributes: options?.attributes || {},
    links: options?.links || [],
  };

  return tracer.startActiveSpan(name, spanOptions, async (span) => {
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
  const span = tracer.startSpan(
    name,
    {
      attributes: attributes || {},
    },
    parentContext,
  );

  return span;
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

  return createSpanContext({
    traceId,
    spanId,
    isRemote: true,
    traceFlags: flags & TraceFlags.SAMPLED ? TraceFlags.SAMPLED : TraceFlags.NONE,
    traceState: traceState ? createTraceState(traceState) : undefined,
  });
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
  return meter.createCounter(name, {
    description,
    unit,
  });
}

/**
 * Create a histogram metric
 */
export function createHistogram(name: string, description?: string, unit?: string) {
  return meter.createHistogram(name, {
    description,
    unit,
  });
}

/**
 * Create a gauge metric
 */
export function createGauge(name: string, description?: string, unit?: string) {
  return meter.createObservableGauge(name, {
    description,
    unit,
  });
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
  const logAttributes = {
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
      logger.info(message, logAttributes);
      break;
    case 'warn':
      logger.warn(message, logAttributes);
      break;
    case 'error':
      logger.error(message, logAttributes);
      break;
  }
}
