import { randomUUID } from 'node:crypto';
import type { Context, Next } from 'hono';
import { getCorrelationIdFromContext, runWithLogContext } from './log-context.js';
import type { Logger } from './logger.js';
import type { CorrelationIdOptions } from './types.js';

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
function extractCorrelationId(headers: Headers, headerName?: string): string | null {
	const candidates = new Set<string>([
		...(headerName ? [headerName.toLowerCase()] : []),
		...DEFAULT_HEADERS,
	]);

	for (const header of candidates) {
		const value = headers.get(header);
		if (value) {
			if (header === 'traceparent') {
				const match = value.match(/^00-([a-f0-9]{32})-/);
				if (match) {
					return match[1];
				}
				continue;
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
	const { logger, headerName = 'X-Correlation-ID', idGenerator = generateCorrelationId } = options;

	return async (c: Context, next: Next) => {
		const normalizedHeaderName = headerName.toLowerCase();
		const correlationId = extractCorrelationId(c.req.raw.headers, normalizedHeaderName) || idGenerator();

		// Update request/response context with the correlation ID so downstream handlers and tests can access it
		c.res.headers.set(headerName, correlationId);
		c.set('correlationId', correlationId);

		// Run the downstream chain within the async context so loggers can retrieve the ID automatically
		return runWithLogContext({ correlationId }, async () => {
			let scopedLogger: Logger | undefined;

			if (logger) {
				scopedLogger = logger.child({ correlationId });
				c.set('logger', scopedLogger);
			}

			await next();

			if (logger) {
				await logger.flush();

				if (scopedLogger && scopedLogger !== logger) {
					await scopedLogger.flush();
				}
			}
		});
	};
}

/**
 * Get correlation ID from context
 */
export function getCorrelationId(c: Context): string | undefined {
	return c.get('correlationId') ?? getCorrelationIdFromContext();
}

/**
 * Get logger with correlation ID from context
 */
export function getLogger(c: Context): Logger | undefined {
	return c.get('logger');
}
