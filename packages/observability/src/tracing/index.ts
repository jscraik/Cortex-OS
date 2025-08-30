/**
 * @fileoverview OTEL tracing with ULID propagation
 */

import { trace, context, SpanStatusCode, SpanKind } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { generateRunId, type ULID, type TraceContext } from '../index.js';

const tracer = trace.getTracer('@cortex-os/observability');

/**
 * Initialize OTEL tracing
 */
export function initializeTracing(serviceName: string, version: string = '1.0.0'): NodeSDK {
  const sdk = new NodeSDK({
    resource: new Resource({
      [ATTR_SERVICE_NAME]: serviceName,
      [ATTR_SERVICE_VERSION]: version,
    }),
    instrumentations: [getNodeAutoInstrumentations()],
  });

  sdk.start();
  return sdk;
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
  }
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
      const traceContext: TraceContext = {
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
        span.recordException(error instanceof Error ? error : new Error(String(error)));
        throw error;
      } finally {
        span.end();
      }
    }
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

  const runId = span.getAttributes()['cortex.run_id'] as string;
  if (!runId) return null;

  return {
    runId: runId as ULID,
    traceId: span.spanContext().traceId,
    spanId: span.spanContext().spanId,
  };
}