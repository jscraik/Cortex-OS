import type { TraceContext } from '@cortex-os/a2a-contracts/trace-context';

type ValidationError = {
  type: 'validation';
  field: string;
  message: string;
};

type NotFoundError = {
  type: 'not-found';
  method: string;
  message: string;
};

type ParseError = {
  type: 'parse';
  message: string;
};

type UnknownError = {
  type: 'unknown';
  message: string;
};

type ApplicationError = ValidationError | NotFoundError | ParseError | UnknownError;

type JsonRpcError = {
  code: number;
  message: string;
  data?: {
    traceparent: string;
    tracestate?: string;
    baggage?: string;
  };
};

/**
 * Format trace context as W3C headers.
 * Pure function for trace context formatting.
 */
function formatTraceContext(trace: TraceContext) {
  return {
    traceparent: `00-${trace.traceId}-${trace.spanId}-${trace.traceFlags.toString(16)}`,
    tracestate: trace.traceState,
    baggage: trace.baggage,
  };
}

/**
 * Map application errors to JSON-RPC errors with trace context.
 * Pure function for error mapping.
 */
export function mapToJsonRpcError(error: ApplicationError, trace: TraceContext): JsonRpcError {
  const traceHeaders = formatTraceContext(trace);

  switch (error.type) {
    case 'validation':
      return {
        code: -32602,
        message: `Invalid params: ${error.field} ${error.message}`,
        data: traceHeaders,
      };

    case 'not-found':
      return {
        code: -32601,
        message: `Method not found: ${error.method}`,
        data: traceHeaders,
      };

    case 'parse':
      return {
        code: -32700,
        message: `Parse error: ${error.message}`,
        data: traceHeaders,
      };

    case 'unknown':
      return {
        code: -32603,
        message: `Internal error: ${error.message}`,
        data: traceHeaders,
      };
  }
}
