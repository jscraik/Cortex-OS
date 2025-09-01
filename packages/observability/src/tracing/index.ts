/**
 * @fileoverview OTEL tracing with ULID propagation
 */

import { trace, SpanStatusCode, SpanKind } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { ParentBasedSampler, TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-node';
import { z } from 'zod';
import { createLogger, logWithContext } from '../logging/index.js';
import { generateRunId } from '../ulids.js';
import type { ULID, TraceContext, RequestId } from '../types.js';

const tracer = trace.getTracer('@cortex-os/observability');

/**
 * Initialize OTEL tracing
 */
const initSchema = z.object({
  serviceName: z.string(),
  version: z.string().default('1.0.0'),
  samplingRatio: z.number().min(0).max(1).default(1),
});

export function initializeTracing(cfg: z.infer<typeof initSchema>): NodeSDK {
  const { serviceName, version, samplingRatio } = initSchema.parse(cfg);
  const logger = createLogger('observability.tracing');
  const sdk = new NodeSDK({
    resource: new Resource({
      [ATTR_SERVICE_NAME]: serviceName,
      [ATTR_SERVICE_VERSION]: version,
    }),
    instrumentations: [getNodeAutoInstrumentations()],
    traceExporter: new OTLPTraceExporter(),
    metricReader: new PeriodicExportingMetricReader({ exporter: new OTLPMetricExporter() }),
    sampler: new ParentBasedSampler({ root: new TraceIdRatioBasedSampler(samplingRatio) }),
  });

  sdk.start();
  const shutdown = async () => {
    try {
      await sdk.shutdown();
    } catch (err) {
      logWithContext(logger, 'error', 'Tracing shutdown error', generateRunId(), undefined, { error: err });
    }
  };
  for (const sig of ['SIGINT', 'SIGTERM', 'beforeExit'] as const) {
    process.once(sig, shutdown);
  }
  return sdk;
}

/**
 * Create a new span with ULID context
 */
export async function withSpan<T>(
  name: string,
  fn: (runId: ULID, traceContext: TraceContext) => Promise<T>,
  options: { runId?: ULID; requestId?: RequestId; kind?: SpanKind; attributes?: Record<string, string | number | boolean> } = {},
): Promise<T> {
  const runId = options.runId || generateRunId();
  return tracer.startActiveSpan(
    name,
    {
      kind: options.kind || SpanKind.INTERNAL,
      attributes: {
        'cortex.run_id': runId,
        ...(options.requestId && { 'cortex.request_id': options.requestId }),
        ...options.attributes,
      },
    },
    async (span) => {
      const ctx: TraceContext = {
        runId,
        requestId: options.requestId,
        traceId: span.spanContext().traceId,
        spanId: span.spanContext().spanId,
      };
      try {
        const result = await fn(runId, ctx);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: error instanceof Error ? error.message : String(error) });
        span.recordException(error instanceof Error ? error : new Error(String(error)));
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
export function addRunIdToSpan(runId: ULID): void {
  const span = trace.getActiveSpan();
  if (span) {
    span.setAttributes({
      'cortex.run_id': runId,
    });
  }
}

/**
 * Add request ID to active span
 */
export function addRequestIdToSpan(requestId: RequestId): void {
  const span = trace.getActiveSpan();
  if (span) {
    span.setAttributes({ 'cortex.request_id': requestId });
  }
}

/**
 * Get current trace context
 */
export function getCurrentTraceContext(): TraceContext | null {
  const span = trace.getActiveSpan();
  if (!span) return null;

  const runId = span.getAttributes()['cortex.run_id'] as string;
  if (!runId) return null;

  const requestId = span.getAttributes()['cortex.request_id'] as string | undefined;

  return {
    runId: runId as ULID,
    requestId,
    traceId: span.spanContext().traceId,
    spanId: span.spanContext().spanId,
  };
}
