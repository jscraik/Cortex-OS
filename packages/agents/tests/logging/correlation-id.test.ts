import { Hono } from 'hono';
import { beforeEach, describe, expect, it } from 'vitest';
import { correlationIdMiddleware } from '../../src/logging/correlation-id.js';
import { Logger } from '../../src/logging/logger.js';
import { createMemoryWritableStream } from '../utils/test-stream.js';

describe('Correlation ID Middleware', () => {
	let app: Hono;
	let capturedLogs: string[];

	beforeEach(() => {
		capturedLogs = [];

		const stream = createMemoryWritableStream((data) => {
			capturedLogs.push(data);
		});

		const logger = new Logger({
			level: 'info',
			format: 'json',
			streams: [
				{
					stream,
					level: 'trace',
				},
			],
		});

		app = new Hono();
		app.use('*', correlationIdMiddleware({ logger }));
		app.get('/test', (c) => {
			// Log something to verify correlation ID inclusion
			logger.info('Test endpoint called');
			return c.json({ success: true });
		});
	});

	describe('Correlation ID generation', () => {
		it('should generate new correlation ID when not provided', async () => {
			// RED: Test fails because implementation doesn't exist
			const res = await app.request('/test');

			expect(res.status).toBe(200);
			const _body = await res.json();

			// Check response header
			expect(res.headers.get('X-Correlation-ID')).toBeDefined();
			expect(res.headers.get('X-Correlation-ID')).toMatch(/^[a-f0-9-]{36}$/);
		});

		it('should use provided correlation ID from header', async () => {
			// RED: Test fails because implementation doesn't exist
			const providedId = 'test-correlation-id-123';
			const res = await app.request('/test', {
				headers: {
					'X-Correlation-ID': providedId,
				},
			});

			expect(res.status).toBe(200);
			expect(res.headers.get('X-Correlation-ID')).toBe(providedId);
		});

		it('should use correlation ID from trace parent header', async () => {
			// RED: Test fails because implementation doesn't exist
			const traceParent = '00-12345678901234567890123456789012-1234567890123456-01';
			const res = await app.request('/test', {
				headers: {
					traceparent: traceParent,
				},
			});

			expect(res.status).toBe(200);
			const correlationId = res.headers.get('X-Correlation-ID');
			expect(correlationId).toBeDefined();
			expect(correlationId).toContain('1234567890123456'); // Should include trace ID
		});
	});

	describe('Correlation ID in logs', () => {
		it('should include correlation ID in all log messages', async () => {
			// RED: Test fails because implementation doesn't exist
			const res = await app.request('/test');

			expect(res.status).toBe(200);

			// Check logs
			expect(capturedLogs).toHaveLength(1);
			const logEntry = JSON.parse(capturedLogs[0]);
			expect(logEntry.correlationId).toBeDefined();
			expect(logEntry.correlationId).toBe(res.headers.get('X-Correlation-ID'));
		});

		it('should propagate correlation ID through async contexts', async () => {
			// RED: Test fails because implementation doesn't exist
			const res = await app.request('/test');

			expect(res.status).toBe(200);

			// The correlation ID should be available in the async context
			// and included in the log message
			const logEntry = JSON.parse(capturedLogs[0]);
			expect(logEntry.correlationId).toBeDefined();
			expect(logEntry.msg).toBe('Test endpoint called');
		});
	});

	describe('Header naming variations', () => {
		it('should accept X-Request-ID header', async () => {
			// RED: Test fails because implementation doesn't exist
			const requestId = 'request-id-456';
			const res = await app.request('/test', {
				headers: {
					'X-Request-ID': requestId,
				},
			});

			expect(res.status).toBe(200);
			expect(res.headers.get('X-Correlation-ID')).toBe(requestId);
		});

		it('should accept correlation-id header (lowercase)', async () => {
			// RED: Test fails because implementation doesn't exist
			const correlationId = 'lowercase-id-789';
			const res = await app.request('/test', {
				headers: {
					'correlation-id': correlationId,
				},
			});

			expect(res.status).toBe(200);
			expect(res.headers.get('X-Correlation-ID')).toBe(correlationId);
		});
	});

	describe('Configuration options', () => {
		it('should use custom header name when configured', async () => {
			// RED: Test fails because implementation doesn't exist
			const customApp = new Hono();
			customApp.use(
				'*',
				correlationIdMiddleware({
					headerName: 'X-Trace-ID',
				}),
			);
			customApp.get('/test', (c) => c.json({ success: true }));

			const traceId = 'custom-trace-id';
			const res = await customApp.request('/test', {
				headers: {
					'X-Trace-ID': traceId,
				},
			});

			expect(res.status).toBe(200);
			expect(res.headers.get('X-Trace-ID')).toBe(traceId);
		});

		it('should use custom ID generator when provided', async () => {
			// RED: Test fails because implementation doesn't exist
			const customApp = new Hono();
			customApp.use(
				'*',
				correlationIdMiddleware({
					idGenerator: () => 'custom-generated-id',
				}),
			);
			customApp.get('/test', (c) => c.json({ success: true }));

			const res = await customApp.request('/test');

			expect(res.status).toBe(200);
			expect(res.headers.get('X-Correlation-ID')).toBe('custom-generated-id');
		});
	});

	describe('Error handling', () => {
		it('should handle malformed trace parent headers gracefully', async () => {
			// RED: Test fails because implementation doesn't exist
			const res = await app.request('/test', {
				headers: {
					traceparent: 'invalid-trace-parent',
				},
			});

			expect(res.status).toBe(200);
			// Should fall back to generating a new ID
			expect(res.headers.get('X-Correlation-ID')).toBeDefined();
			expect(res.headers.get('X-Correlation-ID')).not.toBe('invalid-trace-parent');
		});

		it('should not fail when logger is not provided', async () => {
			// RED: Test fails because implementation doesn't exist
			const noLoggerApp = new Hono();
			noLoggerApp.use('*', correlationIdMiddleware({}));
			noLoggerApp.get('/test', (c) => c.json({ success: true }));

			const res = await noLoggerApp.request('/test');

			expect(res.status).toBe(200);
			expect(res.headers.get('X-Correlation-ID')).toBeDefined();
		});
	});
});
