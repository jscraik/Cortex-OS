import type { FastMcpServer } from 'fastmcp';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startTransport } from '../server/transport.js';
import type { ServerConfig } from '../utils/config.js';

const createServerStub = () => {
	return {
		start: vi.fn().mockResolvedValue(undefined),
		stop: vi.fn().mockResolvedValue(undefined),
	} as unknown as FastMcpServer;
};

const createLoggerStub = () =>
	({
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
		trace: vi.fn(),
	}) as any;

const baseConfig: ServerConfig = {
	host: '127.0.0.1',
	httpEndpoint: '/mcp',
	logLevel: 'silent',
	metricsEnabled: false,
	piecesEnabled: false,
	codebaseSearchEnabled: false,
	ollamaEnabled: false,
	ollamaHost: 'http://127.0.0.1:11434',
	port: 3024,
	sseEndpoint: '/sse',
	promptsEnabled: true,
	resourcesEnabled: true,
};

const ORIGINAL_ENV = { ...process.env };

describe('startTransport HTTP auth guard', () => {
	beforeEach(() => {
		process.env = { ...ORIGINAL_ENV };
	});

	afterEach(() => {
		process.env = { ...ORIGINAL_ENV };
		vi.restoreAllMocks();
	});

	it('throws before starting HTTP transport when MCP_API_KEY is missing', async () => {
		process.env.MCP_TRANSPORT = 'http';
		delete process.env.MCP_API_KEY;

		const server = createServerStub();
		const logger = createLoggerStub();

		await expect(startTransport(server, logger, baseConfig)).rejects.toThrow(
			/MCP_API_KEY is required/i,
		);
		expect(server.start).not.toHaveBeenCalled();
		expect(logger.error).toHaveBeenCalled();
	});

	it('allows HTTP transport when MCP_API_KEY is configured', async () => {
		process.env.MCP_API_KEY = 'secret-key';
		process.env.MCP_TRANSPORT = 'http';

		const server = createServerStub();
		const logger = createLoggerStub();

		const controller = await startTransport(server, logger, baseConfig);

		expect(server.start).toHaveBeenCalledWith({
			transportType: 'httpStream',
			httpStream: {
				enableJsonResponse: true,
				endpoint: '/mcp',
				host: '127.0.0.1',
				port: 3024,
				stateless: true,
			},
		});
		expect(controller.mode).toBe('http');
	});

	it('does not require MCP_API_KEY for stdio transport', async () => {
		process.env.MCP_TRANSPORT = 'stdio';
		delete process.env.MCP_API_KEY;

		const server = createServerStub();
		const logger = createLoggerStub();

		const controller = await startTransport(server, logger, baseConfig);

		expect(server.start).toHaveBeenCalledWith({ transportType: 'stdio' });
		expect(controller.mode).toBe('stdio');
	});
});
