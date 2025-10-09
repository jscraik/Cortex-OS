/**
 * Manual Refresh Tool Tests
 * Tests for manual refresh functionality and client compatibility
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MCPNotificationHandler } from '../notifications/handlers.js';
import { Server } from '../server.js';
import {
	createManualRefreshTool,
	ManualRefreshTool,
	needsManualRefresh,
	type RefreshParams,
	refreshMCPResources,
} from '../tools/refresh.js';

describe('ManualRefreshTool', () => {
	let server: Server;
	let notificationHandler: MCPNotificationHandler;
	let refreshTool: ManualRefreshTool;

	beforeEach(() => {
		server = new Server();
		notificationHandler = {
			emitPromptsListChanged: vi.fn().mockResolvedValue(undefined),
			emitResourcesListChanged: vi.fn().mockResolvedValue(undefined),
			emitResourcesUpdated: vi.fn().mockResolvedValue(undefined),
			emitToolsListChanged: vi.fn().mockResolvedValue(undefined),
			getStats: vi.fn().mockReturnValue({
				queueSize: 0,
				processing: false,
			}),
		} as any;

		refreshTool = createManualRefreshTool(server, notificationHandler);
		vi.clearAllMocks();
	});

	describe('Tool Registration', () => {
		it('should register refresh tool with server', () => {
			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			refreshTool.register();

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('"event":"refresh_tool_registered"'),
			);

			consoleSpy.mockRestore();
		});
	});

	describe('Refresh Operations', () => {
		beforeEach(() => {
			refreshTool.register();
		});

		it('should refresh all resources with default scope', async () => {
			const params: RefreshParams = {};

			const result = await refreshTool.handleRefresh(params);

			expect(notificationHandler.emitPromptsListChanged).toHaveBeenCalled();
			expect(notificationHandler.emitResourcesListChanged).toHaveBeenCalled();
			expect(notificationHandler.emitToolsListChanged).toHaveBeenCalled();

			expect(result.refreshed).toEqual({
				prompts: true,
				resources: true,
				tools: true,
			});
			expect(result.message).toContain('Successfully refreshed: prompts, resources, tools');
		});

		it('should refresh only prompts', async () => {
			const params: RefreshParams = {
				scope: 'prompts',
			};

			const result = await refreshTool.handleRefresh(params);

			expect(notificationHandler.emitPromptsListChanged).toHaveBeenCalled();
			expect(notificationHandler.emitResourcesListChanged).not.toHaveBeenCalled();
			expect(notificationHandler.emitToolsListChanged).not.toHaveBeenCalled();

			expect(result.refreshed).toEqual({
				prompts: true,
				resources: false,
				tools: false,
			});
			expect(result.message).toContain('Successfully refreshed: prompts');
		});

		it('should refresh only resources', async () => {
			const params: RefreshParams = {
				scope: 'resources',
			};

			const result = await refreshTool.handleRefresh(params);

			expect(notificationHandler.emitPromptsListChanged).not.toHaveBeenCalled();
			expect(notificationHandler.emitResourcesListChanged).toHaveBeenCalled();
			expect(notificationHandler.emitToolsListChanged).not.toHaveBeenCalled();

			expect(result.refreshed).toEqual({
				prompts: false,
				resources: true,
				tools: false,
			});
			expect(result.message).toContain('Successfully refreshed: resources');
		});

		it('should refresh only tools', async () => {
			const params: RefreshParams = {
				scope: 'tools',
			};

			const result = await refreshTool.handleRefresh(params);

			expect(notificationHandler.emitPromptsListChanged).not.toHaveBeenCalled();
			expect(notificationHandler.emitResourcesListChanged).not.toHaveBeenCalled();
			expect(notificationHandler.emitToolsListChanged).toHaveBeenCalled();

			expect(result.refreshed).toEqual({
				prompts: false,
				resources: false,
				tools: true,
			});
			expect(result.message).toContain('Successfully refreshed: tools');
		});

		it('should handle force refresh', async () => {
			const params: RefreshParams = {
				scope: 'all',
				force: true,
			};

			const result = await refreshTool.handleRefresh(params);

			expect(notificationHandler.emitPromptsListChanged).toHaveBeenCalled();
			expect(notificationHandler.emitResourcesListChanged).toHaveBeenCalled();
			expect(notificationHandler.emitToolsListChanged).toHaveBeenCalled();

			expect(result.refreshed.prompts).toBe(true);
			expect(result.refreshed.resources).toBe(true);
			expect(result.refreshed.tools).toBe(true);
		});

		it('should include correlation ID in result', async () => {
			const params: RefreshParams = {
				scope: 'prompts',
				_meta: {
					correlationId: 'test-correlation-123',
				},
			};

			const result = await refreshTool.handleRefresh(params);

			expect(result.correlationId).toBe('test-correlation-123');
		});

		it('should generate correlation ID when not provided', async () => {
			const params: RefreshParams = {
				scope: 'prompts',
			};

			const result = await refreshTool.handleRefresh(params);

			expect(result.correlationId).toMatch(/^refresh_\d+_[a-z0-9]+$/);
		});

		it('should include timestamp in result', async () => {
			const params: RefreshParams = {
				scope: 'prompts',
			};

			const before = Date.now();
			const result = await refreshTool.handleRefresh(params);
			const after = Date.now();

			expect(result.timestamp).toBeDefined();
			const timestamp = new Date(result.timestamp).getTime();
			expect(timestamp).toBeGreaterThanOrEqual(before);
			expect(timestamp).toBeLessThanOrEqual(after);
		});
	});

	describe('Error Handling', () => {
		beforeEach(() => {
			refreshTool.register();
		});

		it('should handle notification handler errors gracefully', async () => {
			notificationHandler.emitPromptsListChanged.mockRejectedValue(
				new Error('Notification failed'),
			);

			const params: RefreshParams = {
				scope: 'prompts',
			};

			await expect(refreshTool.handleRefresh(params)).rejects.toThrow('Notification failed');
		});

		it('should handle partial failures', async () => {
			notificationHandler.emitPromptsListChanged.mockResolvedValue(undefined);
			notificationHandler.emitResourcesListChanged.mockRejectedValue(
				new Error('Resource refresh failed'),
			);

			const params: RefreshParams = {
				scope: 'all',
			};

			await expect(refreshTool.handleRefresh(params)).rejects.toThrow('Resource refresh failed');
		});
	});

	describe('Logging and Monitoring', () => {
		beforeEach(() => {
			refreshTool.register();
		});

		it('should log refresh start events', async () => {
			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			const params: RefreshParams = {
				scope: 'prompts',
				force: true,
			};

			await refreshTool.handleRefresh(params);

			expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('"event":"refresh_started"'));
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					scope: 'prompts',
					force: true,
				}),
			);

			consoleSpy.mockRestore();
		});

		it('should log refresh completion events', async () => {
			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			const params: RefreshParams = {
				scope: 'all',
			};

			await refreshTool.handleRefresh(params);

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('"event":"refresh_completed"'),
			);

			consoleSpy.mockRestore();
		});

		it('should log individual refresh operations', async () => {
			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			const params: RefreshParams = {
				scope: 'all',
			};

			await refreshTool.handleRefresh(params);

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('"event":"prompts_refreshed"'),
			);
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('"event":"resources_refreshed"'),
			);
			expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('"event":"tools_refreshed"'));

			consoleSpy.mockRestore();
		});
	});

	describe('Message Generation', () => {
		beforeEach(() => {
			refreshTool.register();
		});

		it('should generate appropriate messages for different scopes', async () => {
			const testCases = [
				{ scope: 'prompts' as const, expectedPattern: /prompts/ },
				{ scope: 'resources' as const, expectedPattern: /resources/ },
				{ scope: 'tools' as const, expectedPattern: /tools/ },
				{ scope: 'all' as const, expectedPattern: /prompts, resources, tools/ },
			];

			for (const testCase of testCases) {
				const params: RefreshParams = { scope: testCase.scope };
				const result = await refreshTool.handleRefresh(params);

				expect(result.message).toMatch(testCase.expectedPattern);
				expect(result.message).toMatch(/\[brAInwav\]/);
			}
		});

		it('should handle empty refresh results', async () => {
			// Mock notification handler to simulate no refreshes
			notificationHandler.emitPromptsListChanged.mockImplementation(() => {
				// Do nothing - simulate no change
			});

			const params: RefreshParams = {
				scope: 'prompts',
			};

			const result = await refreshTool.handleRefresh(params);

			expect(result.message).toContain('No items were refreshed');
		});
	});
});

describe('Factory Functions', () => {
	it('should create manual refresh tool', () => {
		const server = new Server();
		const mockNotificationHandler = {
			emitPromptsListChanged: vi.fn(),
			emitResourcesListChanged: vi.fn(),
			emitToolsListChanged: vi.fn(),
		} as any;

		const tool = createManualRefreshTool(server, mockNotificationHandler);

		expect(tool).toBeInstanceOf(ManualRefreshTool);
	});
});

describe('Utility Functions', () => {
	describe('needsManualRefresh', () => {
		it('should detect clients that need manual refresh', () => {
			const clientsNeedingRefresh = [
				{ name: 'claude-code', version: '1.0.0' },
				{ name: 'Claude Code', version: '2.0.0' },
				{ name: 'anthropic-claude', version: '1.5.0' },
				{ name: 'CLAUDE', version: '1.0.0' },
			];

			clientsNeedingRefresh.forEach((client) => {
				expect(needsManualRefresh(client)).toBe(true);
			});
		});

		it('should allow clients that support notifications', () => {
			const clientsWithSupport = [
				{ name: 'mcp-client', version: '1.0.0' },
				{ name: 'custom-tool', version: '2.0.0' },
				{ name: 'advanced-client', version: '1.5.0' },
				{ name: '', version: '1.0.0' }, // Empty name
				{ version: '1.0.0' }, // No name
			];

			clientsWithSupport.forEach((client) => {
				expect(needsManualRefresh(client)).toBe(false);
			});
		});

		it('should handle undefined client info', () => {
			expect(needsManualRefresh(undefined)).toBe(false);
			expect(needsManualRefresh(null as any)).toBe(false);
		});

		it('should be case insensitive for client names', () => {
			const testCase = [
				{ name: 'CLAUDE-CODE', needsRefresh: true },
				{ name: 'Claude-Code', needsRefresh: true },
				{ name: 'claude-code', needsRefresh: true },
				{ name: 'ANTHROPIC-CLAUDE', needsRefresh: true },
				{ name: 'MCP-CLIENT', needsRefresh: false },
			];

			testCase.forEach(({ name, needsRefresh }) => {
				expect(needsManualRefresh({ name, version: '1.0.0' })).toBe(needsRefresh);
			});
		});
	});

	describe('refreshMCPResources', () => {
		it('should log CLI refresh initiation', () => {
			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			refreshMCPResources('all', false);

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					event: 'cli_refresh_initiated',
					scope: 'all',
					force: false,
				}),
			);

			consoleSpy.mockRestore();
		});

		it('should log refresh with custom parameters', () => {
			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			refreshMCPResources('prompts', true);

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					event: 'cli_refresh_initiated',
					scope: 'prompts',
					force: true,
				}),
			);

			consoleSpy.mockRestore();
		});

		it('should use default parameters', () => {
			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			refreshMCPResources();

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					event: 'cli_refresh_initiated',
					scope: 'all',
					force: false,
				}),
			);

			consoleSpy.mockRestore();
		});
	});
});

describe('Integration Scenarios', () => {
	it('should handle real-world refresh workflow', async () => {
		const server = new Server();
		const notificationHandler = {
			emitPromptsListChanged: vi.fn().mockResolvedValue(undefined),
			emitResourcesListChanged: vi.fn().mockResolvedValue(undefined),
			emitToolsListChanged: vi.fn().mockResolvedValue(undefined),
			getStats: vi.fn().mockReturnValue({ queueSize: 0, processing: false }),
		} as any;

		const refreshTool = createManualRefreshTool(server, notificationHandler);
		refreshTool.register();

		// Simulate a client that doesn't support notifications
		const clientInfo = { name: 'claude-code', version: '1.0.0' };
		expect(needsManualRefresh(clientInfo)).toBe(true);

		// Client calls refresh tool
		const params: RefreshParams = {
			scope: 'all',
			force: false,
		};

		const result = await refreshTool.handleRefresh(params);

		// Verify all notifications were sent
		expect(notificationHandler.emitPromptsListChanged).toHaveBeenCalled();
		expect(notificationHandler.emitResourcesListChanged).toHaveBeenCalled();
		expect(notificationHandler.emitToolsListChanged).toHaveBeenCalled();

		// Verify result structure
		expect(result).toMatchObject({
			refreshed: {
				prompts: true,
				resources: true,
				tools: true,
			},
			message: expect.stringContaining('[brAInwav]'),
			correlationId: expect.stringMatching(/^refresh_\d+_[a-z0-9]+$/),
			timestamp: expect.any(String),
		});
	});

	it('should handle partial refresh with specific scope', async () => {
		const server = new Server();
		const notificationHandler = {
			emitPromptsListChanged: vi.fn().mockResolvedValue(undefined),
			emitResourcesListChanged: vi.fn().mockResolvedValue(undefined),
			emitToolsListChanged: vi.fn().mockResolvedValue(undefined),
			getStats: vi.fn().mockReturnValue({ queueSize: 0, processing: false }),
		} as any;

		const refreshTool = createManualRefreshTool(server, notificationHandler);
		refreshTool.register();

		// Client wants to refresh only prompts and tools
		const promptsParams: RefreshParams = { scope: 'prompts' };
		const toolsParams: RefreshParams = { scope: 'tools' };

		const promptsResult = await refreshTool.handleRefresh(promptsParams);
		const toolsResult = await refreshTool.handleRefresh(toolsParams);

		// Verify only specific notifications were sent
		expect(notificationHandler.emitPromptsListChanged).toHaveBeenCalledTimes(1);
		expect(notificationHandler.emitToolsListChanged).toHaveBeenCalledTimes(1);
		expect(notificationHandler.emitResourcesListChanged).not.toHaveBeenCalled();

		// Verify results
		expect(promptsResult.refreshed).toEqual({
			prompts: true,
			resources: false,
			tools: false,
		});

		expect(toolsResult.refreshed).toEqual({
			prompts: false,
			resources: false,
			tools: true,
		});
	});

	it('should handle error scenarios gracefully', async () => {
		const server = new Server();
		const notificationHandler = {
			emitPromptsListChanged: vi.fn().mockResolvedValue(undefined),
			emitResourcesListChanged: vi.fn().mockRejectedValue(new Error('Network error')),
			emitToolsListChanged: vi.fn().mockResolvedValue(undefined),
			getStats: vi.fn().mockReturnValue({ queueSize: 0, processing: false }),
		} as any;

		const refreshTool = createManualRefreshTool(server, notificationHandler);
		refreshTool.register();

		const params: RefreshParams = { scope: 'all' };

		// Should propagate the error
		await expect(refreshTool.handleRefresh(params)).rejects.toThrow('Network error');

		// But prompts and tools should have been attempted
		expect(notificationHandler.emitPromptsListChanged).toHaveBeenCalled();
		expect(notificationHandler.emitToolsListChanged).toHaveBeenCalled();
	});
});
