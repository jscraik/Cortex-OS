import {
  createChildSpan,
  createTraceContext,
  type TraceContext,
} from '@cortex-os/a2a-contracts/trace-context';
import { z } from 'zod';

const messageSchema = z.object({
  type: z.string(),
  source: z.string().startsWith('/'),
  data: z.record(z.any()),
});

type SendMessageParams = {
  message: unknown;
  trace?: TraceContext;
};

type MessageResult = {
  id: string;
  traceparent: string;
  tracestate?: string;
  baggage?: string;
};

type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: { message: string; traceparent: string } };

/**
 * Format W3C trace context headers.
 * Pure function that generates trace headers from context.
 */
function formatTraceHeaders(trace: TraceContext) {
  return {
    traceparent: `00-${trace.traceId}-${trace.spanId}-${trace.traceFlags.toString(16)}`,
    tracestate: trace.traceState,
    baggage: trace.baggage,
  };
}

/**
 * Handle message send with trace context propagation.
 * Pure function that validates and processes messages.
 */
export async function sendMessage(
  params: SendMessageParams,
): Promise<ValidationResult<MessageResult>> {
  // Ensure trace context exists
  const trace = params.trace ?? createTraceContext();
  const childTrace = createChildSpan(trace);

  // Validate message
  const result = messageSchema.safeParse(params.message);
  if (!result.success) {
    return {
      success: false,
      error: {
        message: result.error.issues[0].message,
        traceparent: formatTraceHeaders(childTrace).traceparent,
      },
    };
  }

  // Process valid message
  return {
    success: true,
    data: {
      id: crypto.randomUUID(),
      ...formatTraceHeaders(childTrace),
    },
  };
}
