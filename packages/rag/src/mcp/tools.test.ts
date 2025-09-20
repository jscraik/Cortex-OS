import { beforeEach, describe, expect, it, vi } from 'vitest';

const loggerMocks = vi.hoisted(() => {
	const mockLogger = {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	};

	return {
		mockLogger,
		createLogger: vi.fn(() => mockLogger),
	};
});

import type { handleRAG } from '../index.js';

const ragHandlerMock = vi.hoisted(() => ({
	handleRAG: vi.fn<typeof handleRAG>(),
}));

vi.mock('@cortex-os/observability', () => ({
	createLogger: loggerMocks.createLogger,
}));

vi.mock('../index.js', () => ({
	handleRAG: ragHandlerMock.handleRAG,
}));

// Import after mocks
import { ragIngestTool, ragQueryTool, ragStatusTool } from './tools.js';

vi.mock('../lib/health.js', () => ({
	getDefaultRAGHealth: vi.fn(async () => ({
		ok: true,
		checks: {
			process: { ok: true },
			chunkers: { ok: true },
		},
		timestamp: new Date().toISOString(),
		resources: { rssBytes: 1, heapUsedBytes: 1, heapTotalBytes: 1, uptimeSeconds: 1 },
	})),
}));

describe('rag MCP tool error handling', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		ragHandlerMock.handleRAG.mockResolvedValue('mock response');
	});

	it('returns a structured validation error when query is whitespace', async () => {
		const response = await ragQueryTool.handler({
			query: '   ',
			topK: 3,
			maxTokens: 256,
			timeoutMs: 1_000,
		});

		expect(response.isError).toBe(true);
		expect(response.metadata.tool).toBe('rag_query');

		const payload = JSON.parse(response.content[0]?.text ?? '{}');
		expect(payload.error.code).toBe('validation_error');
		expect(payload.error.message).toContain('Query cannot be empty');
		expect(ragHandlerMock.handleRAG).not.toHaveBeenCalled();
		expect(loggerMocks.mockLogger.warn).toHaveBeenCalledWith(
			expect.objectContaining({
				correlationId: response.metadata.correlationId,
				tool: 'rag_query',
				error: expect.objectContaining({ code: 'validation_error' }),
			}),
			'rag_query validation failed',
		);
	});

	it('wraps upstream errors with diagnostic metadata', async () => {
		ragHandlerMock.handleRAG.mockRejectedValueOnce(new Error('upstream failed'));

		const response = await ragQueryTool.handler({
			query: 'tell me about cortex os',
			topK: 2,
			maxTokens: 512,
			timeoutMs: 2_000,
		});

		expect(response.isError).toBe(true);
		expect(response.metadata.tool).toBe('rag_query');

		const payload = JSON.parse(response.content[0]?.text ?? '{}');
		expect(payload.error.code).toBe('internal_error');
		expect(payload.error.details).toContain('upstream failed');
		expect(loggerMocks.mockLogger.error).toHaveBeenCalledWith(
			expect.objectContaining({
				correlationId: response.metadata.correlationId,
				tool: 'rag_query',
			}),
			'rag_query failed',
		);
	});

	it('enforces metadata safety for ingestion requests', async () => {
		const response = await ragIngestTool.handler({
			content: 'valid chunk',
			metadata: {
				__proto__: {
					injected: true,
				},
			},
		});

		expect(response.isError).toBe(true);
		expect(response.metadata.tool).toBe('rag_ingest');

		const payload = JSON.parse(response.content[0]?.text ?? '{}');
		expect(payload.error.code).toBe('security_error');
		expect(payload.error.message).toContain('Unsafe metadata');
		expect(loggerMocks.mockLogger.warn).toHaveBeenCalledWith(
			expect.objectContaining({
				correlationId: response.metadata.correlationId,
				tool: 'rag_ingest',
				error: expect.objectContaining({ code: 'security_error' }),
			}),
			'rag_ingest validation failed',
		);
	});

	it('limits ingestion content size', async () => {
		const response = await ragIngestTool.handler({
			content: 'a'.repeat(25_001),
		});

		expect(response.isError).toBe(true);
		expect(response.metadata.tool).toBe('rag_ingest');

		const payload = JSON.parse(response.content[0]?.text ?? '{}');
		expect(payload.error.code).toBe('validation_error');
		expect(payload.error.message).toContain('Content exceeds maximum length');
	});

	it('returns validation error for invalid status input', async () => {
		// This test verifies runtime validation of input parameters
		const invalidInput = { includeStats: 'yes' };
		const response = await ragStatusTool.handler(
			invalidInput as Parameters<typeof ragStatusTool.handler>[0],
		);

		expect(response.isError).toBe(true);
		expect(response.metadata.tool).toBe('rag_status');

		const payload = JSON.parse(response.content[0]?.text ?? '{}');
		expect(payload.error.code).toBe('validation_error');
		expect(payload.error.details).toEqual(
			expect.arrayContaining([expect.stringContaining('Expected boolean')]),
		);
	});

	it('includes health summary when requested', async () => {
		const response = await ragStatusTool.handler({ includeStats: false, includeHealth: true });
		expect(response.isError).toBeUndefined();
		const payload = JSON.parse(response.content[0]?.text ?? '{}');
		expect(payload.success).toBe(true);
		expect(payload.status.health).toBeDefined();
		expect(payload.status.health.ok).toBe(true);
		expect(payload.status.health.checks.process.ok).toBe(true);
	});
});
