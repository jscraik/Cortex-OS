/**
 * Pieces Copilot MCP Proxy Tests
 *
 * Unit tests for the Pieces Copilot proxy functionality including
 * connection management, tool registration, and error handling.
 */

import type { Logger } from 'pino';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PiecesCopilotMCPProxy } from '../pieces-copilot-proxy.js';

// Mock RemoteToolProxy
vi.mock('@cortex-os/mcp-bridge/runtime/remote-proxy', () => ({
	RemoteToolProxy: vi.fn().mockImplementation((config) => ({
		connect: vi.fn().mockResolvedValue(undefined),
		getTools: vi.fn().mockReturnValue([
			{
				name: 'ask_pieces_copilot',
				description: 'Ask Pieces Copilot',
				inputSchema: { type: 'object', properties: { question: { type: 'string' } } },
			},
		]),
		isConnected: vi.fn().mockReturnValue(true),
		callTool: vi.fn().mockResolvedValue({ answer: 'Test response' }),
		disconnect: vi.fn().mockResolvedValue(undefined),
		_config: config,
	})),
}));

// Mock metrics
vi.mock('@cortex-os/mcp-bridge/runtime/telemetry/metrics', () => ({
	setPiecesCopilotProxyStatus: vi.fn(),
}));

describe('PiecesCopilotMCPProxy', () => {
	let proxy: PiecesCopilotMCPProxy;
	let mockLogger: Logger;

	beforeEach(() => {
		mockLogger = {
			info: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
			debug: vi.fn(),
		} as any;

		proxy = new PiecesCopilotMCPProxy({
			endpoint: 'http://localhost:39302/model_context_protocol/2024-11-05/sse',
			enabled: true,
			logger: mockLogger,
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should create proxy with correct configuration', () => {
		const { RemoteToolProxy } = require('@cortex-os/mcp-bridge/runtime/remote-proxy');

		expect(RemoteToolProxy).toHaveBeenCalledWith(
			expect.objectContaining({
				endpoint: 'http://localhost:39302/model_context_protocol/2024-11-05/sse',
				enabled: true,
				serviceLabel: 'Pieces Copilot MCP',
				unavailableErrorName: 'PiecesCopilotServiceUnavailableError',
				unavailableErrorMessage: 'Pieces Copilot MCP proxy is temporarily unavailable',
			}),
		);
	});

	it('should connect successfully', async () => {
		await proxy.connect();
		const { RemoteToolProxy } = require('@cortex-os/mcp-bridge/runtime/remote-proxy');
		const mockInstance = RemoteToolProxy.mock.results[0].value;

		expect(mockInstance.connect).toHaveBeenCalled();
	});

	it('should get tools from remote service', () => {
		const tools = proxy.getTools();
		const { RemoteToolProxy } = require('@cortex-os/mcp-bridge/runtime/remote-proxy');
		const mockInstance = RemoteToolProxy.mock.results[0].value;

		expect(mockInstance.getTools).toHaveBeenCalled();
		expect(tools).toHaveLength(1);
		expect(tools[0].name).toBe('ask_pieces_copilot');
	});

	it('should check connection status', () => {
		const isConnected = proxy.isConnected();
		const { RemoteToolProxy } = require('@cortex-os/mcp-bridge/runtime/remote-proxy');
		const mockInstance = RemoteToolProxy.mock.results[0].value;

		expect(mockInstance.isConnected).toHaveBeenCalled();
		expect(isConnected).toBe(true);
	});

	it('should call remote tools', async () => {
		const result = await proxy.callTool('ask_pieces_copilot', { question: 'test question' });
		const { RemoteToolProxy } = require('@cortex-os/mcp-bridge/runtime/remote-proxy');
		const mockInstance = RemoteToolProxy.mock.results[0].value;

		expect(mockInstance.callTool).toHaveBeenCalledWith('ask_pieces_copilot', {
			question: 'test question',
		});
		expect(result).toEqual({ answer: 'Test response' });
	});

	it('should disconnect successfully', async () => {
		await proxy.disconnect();
		const { RemoteToolProxy } = require('@cortex-os/mcp-bridge/runtime/remote-proxy');
		const mockInstance = RemoteToolProxy.mock.results[0].value;

		expect(mockInstance.disconnect).toHaveBeenCalled();
	});

	it('should handle connection errors gracefully', async () => {
		const { RemoteToolProxy } = require('@cortex-os/mcp-bridge/runtime/remote-proxy');
		const mockInstance = RemoteToolProxy.mock.results[0].value;
		mockInstance.connect.mockRejectedValue(new Error('Connection failed'));

		await expect(proxy.connect()).rejects.toThrow('Connection failed');
	});

	it('should handle tool call errors gracefully', async () => {
		const { RemoteToolProxy } = require('@cortex-os/mcp-bridge/runtime/remote-proxy');
		const mockInstance = RemoteToolProxy.mock.results[0].value;
		mockInstance.callTool.mockRejectedValue(new Error('Tool failed'));

		await expect(proxy.callTool('invalid_tool', {})).rejects.toThrow('Tool failed');
	});
});
