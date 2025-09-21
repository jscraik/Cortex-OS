import type { Context, Next } from 'hono';
import type { CorrelationIdOptions } from './types';
import { Logger } from './logger';
import { randomUUID } from 'crypto';

/**
 * Default header names to check for correlation ID
 */
const DEFAULT_HEADERS = [
  'x-correlation-id',
  'x-request-id',
  'correlation-id',
  'traceparent',
] as const;

/**
 * Extract correlation ID from various headers
 */
function extractCorrelationId(headers: Headers): string | null {
  for (const header of DEFAULT_HEADERS) {
    const value = headers.get(header);
    if (value) {
      // For traceparent header, extract the trace ID
      if (header === 'traceparent') {
        const match = value.match(/^00-([a-f0-9]{32})-/);
        if (match) {
          return match[1];
        }
      }
      return value;
    }
  }
  return null;
}

/**
 * Generate a new correlation ID
 */
function generateCorrelationId(): string {
  return randomUUID();
}

/**
 * Middleware for managing correlation IDs across requests
 */
export function correlationIdMiddleware(options: CorrelationIdOptions = {}) {
  const {
    logger,
    headerName = 'X-Correlation-ID',
    idGenerator = generateCorrelationId,
  } = options;

  return async (c: Context, next: Next) => {
    // Extract or generate correlation ID
    const correlationId = extractCorrelationId(c.req.raw.headers) || idGenerator();

    // Add to response headers
    c.res.headers.set(headerName, correlationId);

    // Store in context for access in other middleware/handlers
    c.set('correlationId', correlationId);

    // Add to logger if provided
    if (logger) {
      const childLogger = logger.child({ correlationId });
      c.set('logger', childLogger);
    }

    await next();
  };
}

/**
 * Get correlation ID from context
 */
export function getCorrelationId(c: Context): string | undefined {
  return c.get('correlationId');
}

/**
 * Get logger with correlation ID from context
 */
export function getLogger(c: Context): Logger | undefined {
  return c.get('logger');
}