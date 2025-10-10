/**
 * MCP Server Tests
 * Tests for base MCP server functionality, capabilities, and error handling
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Server } from '../server.js';

const createLoggerStub = () => ({
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
	debug: vi.fn(),
});

describe('Server', () => {
	let server: Server;
	let logger: ReturnType<typeof createLoggerStub>;

	beforeEach(() => {
		vi.clearAllMocks();
		logger = createLoggerStub();
		server = new Server({ logger });
	});

	describe('Basic Server Operations', () => {
		it('should create a server with default capabilities', () => {
			const serverInfo = server.getServerInfo();

			expect(serverInfo.name).toBe('cortex-os-mcp-server');
			expect(serverInfo.capabilities).toBeDefined();
			expect(serverInfo.capabilities?.prompts?.listChanged).toBe(true);
			expect(serverInfo.capabilities?.resources?.subscribe).toBe(true);
			expect(serverInfo.capabilities?.resources?.listChanged).toBe(true);
			expect(serverInfo.capabilities?.tools?.listChanged).toBe(true);
		});

		it('should register tools successfully', () => {
			const tool = {
				name: 'test-tool',
				description: 'Test tool',
				inputSchema: {
					type: 'object',
					properties: {
						message: { type: 'string' },
					},
				},
				handler: vi.fn().mockResolvedValue({ result: 'success' }),
			};

			server.registerTool(tool);
			const stats = server.getStats();

			expect(stats.toolsCount).toBe(1);
		});

		it('should register prompts successfully', () => {
			const prompt = {
				name: 'test-prompt',
				description: 'Test prompt',
				arguments: [{ name: 'input', description: 'Input argument', required: true }],
			};

			server.registerPrompt(prompt);
			const stats = server.getStats();

			expect(stats.promptsCount).toBe(1);
		});

		it('should register resources successfully', () => {
			const resource = {
				uri: 'resource://test/example',
				name: 'Test Resource',
				description: 'Test resource description',
				mimeType: 'text/plain',
			};

			server.registerResource(resource);
			const stats = server.getStats();

			expect(stats.resourcesCount).toBe(1);
		});
	});

	describe('Request Handling', () => {
		it('should handle initialize request', async () => {
			const request = {
				method: 'initialize',
				params: { protocolVersion: '2024-11-05' },
			};

			const response = await server.handleRequest(request);

			expect(response.result).toBeDefined();
			expect(response.result.name).toBe('cortex-os-mcp-server');
			expect(response.result.capabilities).toBeDefined();
		});

		it('should handle tools/list request', async () => {
			const tool = {
				name: 'test-tool',
				description: 'Test tool',
				inputSchema: { type: 'object' },
				handler: vi.fn(),
			};
			server.registerTool(tool);

			const request = {
				method: 'tools/list',
				id: 'test-1',
			};

			const response = await server.handleRequest(request);

			expect(response.result.tools).toHaveLength(1);
			expect(response.result.tools[0].name).toBe('test-tool');
		});

		it('should handle tools/call request', async () => {
			const mockHandler = vi.fn().mockResolvedValue('test result');
			const tool = {
				name: 'test-tool',
				description: 'Test tool',
				inputSchema: { type: 'object' },
				handler: mockHandler,
			};
			server.registerTool(tool);

			const request = {
				method: 'tools/call',
				params: { name: 'test-tool', arguments: { input: 'test' } },
				id: 'test-2',
			};

			const response = await server.handleRequest(request);

			expect(mockHandler).toHaveBeenCalledWith({ input: 'test' }, expect.any(Object));
			expect(response.result.content).toBeDefined();
			expect(response.result.content[0].type).toBe('text');
		});

		it('should handle prompts/list request', async () => {
			const prompt = {
				name: 'test-prompt',
				description: 'Test prompt',
			};
			server.registerPrompt(prompt);

			const request = {
				method: 'prompts/list',
				id: 'test-3',
			};

			const response = await server.handleRequest(request);

			expect(response.result.prompts).toHaveLength(1);
			expect(response.result.prompts[0].name).toBe('test-prompt');
		});

		it('should handle resources/list request', async () => {
			const resource = {
				uri: 'resource://test/example',
				name: 'Test Resource',
			};
			server.registerResource(resource);

			const request = {
				method: 'resources/list',
				id: 'test-4',
			};

			const response = await server.handleRequest(request);

			expect(response.result.resources).toHaveLength(1);
			expect(response.result.resources[0].uri).toBe('resource://test/example');
		});

		it('should handle resources/subscribe request', async () => {
			const resource = {
				uri: 'resource://test/example',
				name: 'Test Resource',
			};
			server.registerResource(resource);

			const request = {
				method: 'resources/subscribe',
				params: { uri: 'resource://test/example' },
				id: 'test-5',
			};

			const response = await server.handleRequest(request);

			expect(response.result.subscribed).toBe(true);
		});
	});

	describe('Error Handling', () => {
		it('should handle unknown method with proper error', async () => {
			const request = {
				method: 'unknown/method',
				id: 'test-error-1',
			};

			const response = await server.handleRequest(request);

			expect(response.error).toBeDefined();
			expect(response.error.code).toBe(-32601);
			expect(response.error.message).toContain('[brAInwav] Method not found');
		});

		it('should handle tools/call with missing tool name', async () => {
			const request = {
				method: 'tools/call',
				params: {},
				id: 'test-error-2',
			};

			const response = await server.handleRequest(request);

			expect(response.error).toBeDefined();
			expect(response.error.code).toBe(-32602);
		});

		it('should handle tools/call with non-existent tool', async () => {
			const request = {
				method: 'tools/call',
				params: { name: 'non-existent-tool' },
				id: 'test-error-3',
			};

			const response = await server.handleRequest(request);

			expect(response.error).toBeDefined();
			expect(response.error.code).toBe(-32601);
		});

		it('should handle prompts/get with missing prompt name', async () => {
			const request = {
				method: 'prompts/get',
				params: {},
				id: 'test-error-4',
			};

			const response = await server.handleRequest(request);

			expect(response.error).toBeDefined();
			expect(response.error.code).toBe(-32602);
		});

		it('should handle resources/read with missing URI', async () => {
			const request = {
				method: 'resources/read',
				params: {},
				id: 'test-error-5',
			};

			const response = await server.handleRequest(request);

			expect(response.error).toBeDefined();
			expect(response.error.code).toBe(-32602);
		});

		it('should handle resources/subscribe with missing URI', async () => {
			const request = {
				method: 'resources/subscribe',
				params: {},
				id: 'test-error-6',
			};

			const response = await server.handleRequest(request);

			expect(response.error).toBeDefined();
			expect(response.error.code).toBe(-32602);
		});
	});

	describe('Statistics and Monitoring', () => {
		it('should provide accurate statistics', () => {
			const tool = {
				name: 'test-tool',
				description: 'Test tool',
				inputSchema: { type: 'object' },
				handler: vi.fn(),
			};
			const prompt = {
				name: 'test-prompt',
				description: 'Test prompt',
			};
			const resource = {
				uri: 'resource://test/example',
				name: 'Test Resource',
			};

			server.registerTool(tool);
			server.registerPrompt(prompt);
			server.registerResource(resource);

			const stats = server.getStats();

			expect(stats.toolsCount).toBe(1);
			expect(stats.promptsCount).toBe(1);
			expect(stats.resourcesCount).toBe(1);
			expect(stats.requestCount).toBe(0);
			expect(stats.activeRequests).toBe(0);
		});

		it('should track request count', async () => {
			const tool = {
				name: 'test-tool',
				description: 'Test tool',
				inputSchema: { type: 'object' },
				handler: vi.fn().mockResolvedValue('result'),
			};
			server.registerTool(tool);

			await server.handleRequest({ method: 'initialize', id: '1' });
			await server.handleRequest({ method: 'tools/list', id: '2' });
			await server.handleRequest({ method: 'tools/call', params: { name: 'test-tool' }, id: '3' });

			const stats = server.getStats();
			expect(stats.requestCount).toBe(3);
		});
	});

	describe('Structured Logging', () => {
		it('should log structured events with brAInwav branding', () => {
			const tool = {
				name: 'test-tool',
				description: 'Test tool',
				inputSchema: { type: 'object' },
				handler: vi.fn(),
			};

			server.registerTool(tool);

			expect(logger.info).toHaveBeenCalledWith(
				expect.objectContaining({ brand: 'brAInwav', service: 'cortex-os-mcp-server' }),
			);
		});
	});

	describe('Edge Cases', () => {
		it('should handle empty tools list', async () => {
			const request = {
				method: 'tools/list',
				id: 'edge-1',
			};

			const response = await server.handleRequest(request);

			expect(response.result.tools).toEqual([]);
		});

		it('should handle empty prompts list', async () => {
			const request = {
				method: 'prompts/list',
				id: 'edge-2',
			};

			const response = await server.handleRequest(request);

			expect(response.result.prompts).toEqual([]);
		});

		it('should handle empty resources list', async () => {
			const request = {
				method: 'resources/list',
				id: 'edge-3',
			};

			const response = await server.handleRequest(request);

			expect(response.result.resources).toEqual([]);
		});

		it('should handle request without ID', async () => {
			const request = {
				method: 'initialize',
				params: {},
			};

			const response = await server.handleRequest(request);

			expect(response.result).toBeDefined();
			expect(response.id).toBeUndefined();
		});
	});
});
