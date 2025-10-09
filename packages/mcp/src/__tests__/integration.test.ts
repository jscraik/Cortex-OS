/**
 * MCP Integration Tests
 * End-to-end tests for MCP versioned contracts implementation
 */

import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerPromptsCapability } from '../capabilities/prompts.js';
import { registerResourcesCapability } from '../capabilities/resources.js';
import { registerToolsCapability } from '../capabilities/tools.js';
import {
	createVersionedToolCallHandler,
	type VersionedToolCallHandler,
} from '../handlers/toolsCall.js';
import { type MCPFSWatcher, startMCPFSWatcher } from '../notifications/fsWatcher.js';
import {
	createMCPNotificationHandler,
	type MCPNotificationHandler,
} from '../notifications/handlers.js';
import {
	createVersionedToolRegistry,
	type VersionedToolRegistry,
} from '../registry/toolRegistry.js';
import { Server } from '../server.js';
import { createManualRefreshTool, type ManualRefreshTool } from '../tools/refresh.js';

describe('MCP Integration Tests', () => {
	let tempDir: string;
	let server: Server;
	let fileWatcher: MCPFSWatcher;
	let toolRegistry: VersionedToolRegistry;
	let toolCallHandler: VersionedToolCallHandler;
	let notificationHandler: MCPNotificationHandler;
	let refreshTool: ManualRefreshTool;

	beforeEach(async () => {
		// Create temporary directory for tests
		tempDir = join(tmpdir(), `mcp-integration-test-${randomUUID()}`);
		await fs.mkdir(tempDir, { recursive: true });
		await fs.mkdir(join(tempDir, 'prompts'), { recursive: true });
		await fs.mkdir(join(tempDir, 'resources'), { recursive: true });
		await fs.mkdir(join(tempDir, 'tools'), { recursive: true });

		// Initialize components
		server = new Server();
		toolRegistry = createVersionedToolRegistry(server);
		toolCallHandler = createVersionedToolCallHandler(server, toolRegistry, true);
		notificationHandler = createMCPNotificationHandler(server);
		refreshTool = createManualRefreshTool(server, notificationHandler);

		// Register capabilities
		registerPromptsCapability(server);
		registerResourcesCapability(server);
		registerToolsCapability(server);

		// Register tools
		refreshTool.register();

		// Mock chokidar
		vi.doMock('chokidar', () => ({
			watch: vi.fn().mockReturnValue({
				on: vi.fn(),
				close: vi.fn(),
			}),
		}));

		vi.clearAllMocks();
	});

	afterEach(async () => {
		fileWatcher?.stop();
		await fs.rm(tempDir, { recursive: true, force: true });
		vi.restoreAllMocks();
	});

	describe('End-to-End MCP Server Workflow', () => {
		it('should handle complete MCP server initialization', async () => {
			const initRequest = {
				method: 'initialize',
				params: { protocolVersion: '2024-11-05' },
				id: 'init-1',
			};

			const response = await server.handleRequest(initRequest);

			expect(response.result).toBeDefined();
			expect(response.result.capabilities).toBeDefined();
			expect(response.result.capabilities.prompts.listChanged).toBe(true);
			expect(response.result.capabilities.resources.subscribe).toBe(true);
			expect(response.result.capabilities.resources.listChanged).toBe(true);
			expect(response.result.capabilities.tools.listChanged).toBe(true);
		});

		it('should handle tool registration and calling workflow', async () => {
			// Register a test tool
			const testTool = {
				name: 'integration-test-tool',
				version: '1.0.0',
				description: 'Integration test tool',
				inputSchema: {
					type: 'object',
					properties: {
						message: { type: 'string' },
					},
					required: ['message'],
				},
				handler: vi.fn().mockResolvedValue({ echo: 'test response' }),
			};

			toolRegistry.registerTool(testTool);

			// List tools
			const listRequest = {
				method: 'tools/list',
				id: 'list-1',
			};

			const listResponse = await server.handleRequest(listRequest);
			expect(listResponse.result.tools).toHaveLength(1);
			expect(listResponse.result.tools[0].name).toBe('integration-test-tool');

			// Call tool with version constraint
			const callRequest = {
				method: 'tools/call',
				params: {
					name: 'integration-test-tool',
					arguments: { message: 'hello world' },
					tool_requirements: { 'integration-test-tool': '^1.0.0' },
				},
				id: 'call-1',
			};

			const callResponse = await toolCallHandler.handleToolCall(callRequest.params);
			expect(callResponse.content).toBeDefined();
			expect(testTool.handler).toHaveBeenCalledWith({ message: 'hello world' }, expect.any(Object));
		});

		it('should handle prompt registration and listing workflow', async () => {
			// Register a test prompt
			const testPrompt = {
				name: 'integration-test-prompt',
				description: 'Integration test prompt',
				arguments: [{ name: 'input', description: 'Input text', required: true }],
			};

			server.registerPrompt(testPrompt);

			// List prompts
			const request = {
				method: 'prompts/list',
				id: 'prompt-1',
			};

			const response = await server.handleRequest(request);
			expect(response.result.prompts).toHaveLength(1);
			expect(response.result.prompts[0].name).toBe('integration-test-prompt');
		});

		it('should handle resource registration and subscription workflow', async () => {
			// Register a test resource
			const testResource = {
				uri: 'resource://integration/test.txt',
				name: 'Integration Test Resource',
				description: 'Test resource for integration',
				mimeType: 'text/plain',
			};

			server.registerResource(testResource);

			// List resources
			const listRequest = {
				method: 'resources/list',
				id: 'resource-list-1',
			};

			const listResponse = await server.handleRequest(listRequest);
			expect(listResponse.result.resources).toHaveLength(1);
			expect(listResponse.result.resources[0].uri).toBe('resource://integration/test.txt');

			// Subscribe to resource
			const subscribeRequest = {
				method: 'resources/subscribe',
				params: { uri: 'resource://integration/test.txt' },
				id: 'resource-sub-1',
			};

			const subscribeResponse = await server.handleRequest(subscribeRequest);
			expect(subscribeResponse.result.subscribed).toBe(true);
		});
	});

	describe('File System Integration', () => {
		it('should detect and load tool files', async () => {
			const toolFile = join(tempDir, 'tools', 'auto-test.tool.json');
			await fs.writeFile(
				toolFile,
				JSON.stringify({
					name: 'auto-loaded-tool',
					version: '1.0.0',
					description: 'Auto loaded tool',
					inputSchema: { type: 'object' },
				}),
			);

			await toolRegistry.loadFromDirectory(join(tempDir, 'tools'));

			const stats = toolRegistry.getStats();
			expect(stats.totalTools).toBe(1);
			expect(stats.totalVersions).toBe(1);
		});

		it('should handle file system watching and notifications', async () => {
			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			fileWatcher = startMCPFSWatcher(server, {
				toolsPath: join(tempDir, 'tools'),
				debounceMs: 50,
			});

			// Simulate file system event
			const { watch } = await import('chokidar');
			const mockWatcher = (vi.mocked(watch) as any).mock.results[0].value;
			const onCallback = mockWatcher.on.mock.calls.find((call) => call[0] === 'all')?.[1];

			if (onCallback) {
				const toolPath = join(tempDir, 'tools', 'new-tool.tool.json');
				onCallback('add', toolPath);

				// Should emit notification
				expect(consoleSpy).toHaveBeenCalledWith(
					expect.stringContaining('"event":"tools_list_changed_emitted"'),
				);
			}

			consoleSpy.mockRestore();
		});
	});

	describe('Version Constraint Resolution', () => {
		beforeEach(() => {
			// Register multiple versions of a tool
			const versions = ['1.0.0', '1.1.0', '2.0.0'];
			versions.forEach((version) => {
				toolRegistry.registerTool({
					name: 'version-test-tool',
					version,
					description: `Version test tool ${version}`,
					inputSchema: { type: 'object' },
					handler: vi.fn().mockResolvedValue({ version }),
				});
			});
		});

		it('should resolve tools with different constraint types', async () => {
			const testCases = [
				{ constraint: '1.0.0', expected: '1.0.0' },
				{ constraint: '^1.0.0', expected: '1.1.0' },
				{ constraint: '~1.1.0', expected: '1.1.0' },
				{ constraint: '2.0.0', expected: '2.0.0' },
			];

			for (const testCase of testCases) {
				const tool = toolRegistry.resolveTool('version-test-tool', testCase.constraint);
				expect(tool?.version).toBe(testCase.expected);
			}
		});

		it('should validate tool requirements before execution', async () => {
			// Valid constraint
			const validParams = {
				name: 'version-test-tool',
				arguments: {},
				tool_requirements: { 'version-test-tool': '^1.0.0' },
			};

			await expect(toolCallHandler.handleToolCall(validParams)).resolves.toBeDefined();

			// Invalid constraint
			const invalidParams = {
				name: 'version-test-tool',
				arguments: {},
				tool_requirements: { 'version-test-tool': '999.999.999' },
			};

			await expect(toolCallHandler.handleToolCall(invalidParams)).rejects.toThrow();
		});
	});

	describe('Notification System Integration', () => {
		it('should emit notifications for all supported types', async () => {
			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			// Emit all notification types
			await Promise.all([
				notificationHandler.emitPromptsListChanged('test-1'),
				notificationHandler.emitResourcesListChanged('test-2'),
				notificationHandler.emitResourcesUpdated('resource://test/uri', 'test-3'),
				notificationHandler.emitToolsListChanged('test-4'),
			]);

			// Verify all were queued
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('"type":"prompts.list_changed"'),
			);
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('"type":"resources.list_changed"'),
			);
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('"type":"resources.updated"'),
			);
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('"type":"tools.list_changed"'),
			);

			consoleSpy.mockRestore();
		});

		it('should handle manual refresh workflow', async () => {
			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			const refreshParams = {
				scope: 'all' as const,
				force: false,
			};

			const result = await refreshTool.handleRefresh(refreshParams);

			expect(result.refreshed.prompts).toBe(true);
			expect(result.refreshed.resources).toBe(true);
			expect(result.refreshed.tools).toBe(true);
			expect(result.correlationId).toBeDefined();
			expect(result.timestamp).toBeDefined();

			consoleSpy.mockRestore();
		});
	});

	describe('Error Handling and Recovery', () => {
		it('should handle tool execution failures gracefully', async () => {
			const faultyTool = {
				name: 'faulty-tool',
				version: '1.0.0',
				description: 'Faulty tool for testing',
				inputSchema: { type: 'object' },
				handler: vi.fn().mockRejectedValue(new Error('Tool execution failed')),
			};

			toolRegistry.registerTool(faultyTool);

			const params = {
				name: 'faulty-tool',
				arguments: {},
			};

			await expect(toolCallHandler.handleToolCall(params)).rejects.toThrow();
		});

		it('should handle invalid tool constraint specifications', async () => {
			const params = {
				name: 'non-existent-tool',
				arguments: {},
				tool_requirements: { 'non-existent-tool': 'invalid.version' },
			};

			await expect(toolCallHandler.handleToolCall(params)).rejects.toThrow();
		});

		it('should handle file system errors during loading', async () => {
			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			// Try to load from non-existent directory
			await toolRegistry.loadFromDirectory(join(tempDir, 'non-existent'));

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('"event":"failed_to_load_tools_directory"'),
			);

			consoleSpy.mockRestore();
		});
	});

	describe('Performance and Scalability', () => {
		it('should handle multiple rapid tool calls', async () => {
			const mockTool = {
				name: 'performance-test-tool',
				version: '1.0.0',
				description: 'Performance test tool',
				inputSchema: { type: 'object' },
				handler: vi.fn().mockResolvedValue({ result: 'success' }),
			};

			toolRegistry.registerTool(mockTool);

			// Make multiple concurrent calls
			const promises = Array.from({ length: 50 }, (_, i) =>
				toolCallHandler.handleToolCall({
					name: 'performance-test-tool',
					arguments: { index: i },
				}),
			);

			const results = await Promise.all(promises);

			expect(results).toHaveLength(50);
			expect(mockTool.handler).toHaveBeenCalledTimes(50);
		});

		it('should handle large numbers of tools', () => {
			// Register many tools
			for (let i = 0; i < 100; i++) {
				toolRegistry.registerTool({
					name: `bulk-tool-${i}`,
					version: '1.0.0',
					description: `Bulk tool ${i}`,
					inputSchema: { type: 'object' },
				});
			}

			const stats = toolRegistry.getStats();
			expect(stats.totalTools).toBe(100);
			expect(stats.totalVersions).toBe(100);
		});
	});

	describe('Complex Integration Scenarios', () => {
		it('should handle complete workflow with versioned tools and notifications', async () => {
			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			// 1. Register multiple tool versions
			toolRegistry.registerTool({
				name: 'workflow-tool',
				version: '1.0.0',
				description: 'Workflow tool v1',
				inputSchema: { type: 'object' },
				handler: vi.fn().mockResolvedValue({ version: '1.0.0' }),
			});

			toolRegistry.registerTool({
				name: 'workflow-tool',
				version: '2.0.0',
				description: 'Workflow tool v2',
				inputSchema: { type: 'object' },
				handler: vi.fn().mockResolvedValue({ version: '2.0.0' }),
			});

			// 2. Emit notifications
			await notificationHandler.emitToolsListChanged('workflow-test');

			// 3. Call tool with version constraint
			const result = await toolCallHandler.handleToolCall({
				name: 'workflow-tool',
				arguments: { input: 'test' },
				tool_requirements: { 'workflow-tool': '^1.0.0' },
			});

			// 4. Manual refresh
			await refreshTool.handleRefresh({ scope: 'tools' });

			// Verify workflow completed successfully
			expect(result._toolVersion).toBe('1.0.0');
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('"event":"tools_list_changed_emitted"'),
			);

			consoleSpy.mockRestore();
		});

		it('should handle dynamic tool loading and version resolution', async () => {
			// 1. Create tool file
			const toolFile = join(tempDir, 'tools', 'dynamic.tool.json');
			await fs.writeFile(
				toolFile,
				JSON.stringify({
					name: 'dynamic-tool',
					version: '1.0.0',
					description: 'Dynamically loaded tool',
					inputSchema: {
						type: 'object',
						properties: {
							input: { type: 'string' },
						},
					},
				}),
			);

			// 2. Load from directory
			await toolRegistry.loadFromDirectory(join(tempDir, 'tools'));

			// 3. Resolve and call tool
			const tool = toolRegistry.resolveTool('dynamic-tool', '1.0.0');
			expect(tool).toBeDefined();
			expect(tool?.version).toBe('1.0.0');

			// 4. Verify tool is available in server
			const listResponse = await server.handleRequest({
				method: 'tools/list',
				id: 'dynamic-list',
			});

			expect(listResponse.result.tools).toContainEqual(
				expect.objectContaining({ name: 'dynamic-tool@1.0.0' }),
			);
		});
	});
});
