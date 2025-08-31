import { type TraceContext } from '@cortex-os/a2a-contracts/trace-context';

type ProtocolErrorType = 'method-not-found' | 'invalid-params' | 'parse-error';

type ErrorParams = {
  type: ProtocolErrorType;
  method?: string;
  param?: string;
  trace: TraceContext;
};

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
 * Pure function to format trace context.
 */
function formatTraceContext(trace: TraceContext) {
  return {
    traceparent: `00-${trace.traceId}-${trace.spanId}-${trace.traceFlags.toString(16)}`,
    tracestate: trace.traceState,
    baggage: trace.baggage,
  };
}

/**
 * Create a JSON-RPC protocol error with trace context.
 * Pure factory function for creating standardized errors.
 */
export function createProtocolError(params: ErrorParams): JsonRpcError {
  const { type, method, param, trace } = params;
  const traceHeaders = formatTraceContext(trace);

  switch (type) {
    case 'method-not-found':
      return {
        code: -32601,
        message: `Method not found: ${method}`,
        data: traceHeaders,
      };

    case 'invalid-params':
      return {
        code: -32602,
        message: `Invalid params: ${param}`,
        data: traceHeaders,
      };

    case 'parse-error':
      return {
        code: -32700,
        message: 'Parse error',
        data: traceHeaders,
      };
  }
}

/**
 * Type guard for method not found errors.
 * Pure function for error type checking.
 */
export function isMethodNotFound(error: JsonRpcError): boolean {
  return error.code === -32601;
}

/**
 * Type guard for invalid params errors.
 * Pure function for error type checking.
 */
export function isInvalidParams(error: JsonRpcError): boolean {
  return error.code === -32602;
}

/**
 * Type guard for parse errors.
 * Pure function for error type checking.
 */
export function isParseError(error: JsonRpcError): boolean {
  return error.code === -32700;
}
