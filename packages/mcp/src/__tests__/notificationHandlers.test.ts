/**
 * MCP Notification Handlers Tests
 * Tests for notification emission, queuing, and event processing
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	createMCPNotificationHandler,
	MCPNotificationHandler,
	type NotificationEventType,
	Notifications,
} from '../notifications/handlers.js';
import { Server } from '../server.js';

describe('MCPNotificationHandler', () => {
	let server: Server;
	let handler: MCPNotificationHandler;
	let consoleSpy: any;

	beforeEach(() => {
		server = new Server();
		handler = createMCPNotificationHandler(server);
		consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
	});

	afterEach(() => {
		consoleSpy.mockRestore();
		vi.clearAllMocks();
	});

	describe('Basic Notification Emission', () => {
		it('should emit prompts listChanged notification', async () => {
			await handler.emitPromptsListChanged('test-correlation');

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('"event":"notification_queued"'),
			);
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('"type":"prompts.list_changed"'),
			);
		});

		it('should emit resources listChanged notification', async () => {
			await handler.emitResourcesListChanged('test-correlation');

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('"event":"notification_queued"'),
			);
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('"type":"resources.list_changed"'),
			);
		});

		it('should emit resources updated notification', async () => {
			await handler.emitResourcesUpdated('resource://test/example', 'test-correlation');

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('"event":"notification_queued"'),
			);
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'resources.updated',
					data: { uri: 'resource://test/example' },
				}),
			);
		});

		it('should emit tools listChanged notification', async () => {
			await handler.emitToolsListChanged('test-correlation');

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('"event":"notification_queued"'),
			);
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('"type":"tools.list_changed"'),
			);
		});
	});

	describe('Notification Processing', () => {
		it('should process queued notifications', async () => {
			// Mock server emitNotification
			const mockEmitNotification = vi.fn();
			server.emitNotification = mockEmitNotification;

			await handler.emitPromptsListChanged('test-1');

			// Wait for processing
			await new Promise((resolve) => setTimeout(resolve, 10));

			expect(mockEmitNotification).toHaveBeenCalledWith('notifications/prompts/list_changed', {});
		});

		it('should process notifications with correlation IDs', async () => {
			const mockEmitNotification = vi.fn();
			server.emitNotification = mockEmitNotification;

			await handler.emitResourcesUpdated('resource://test/uri', 'test-correlation-123');

			await new Promise((resolve) => setTimeout(resolve, 10));

			expect(mockEmitNotification).toHaveBeenCalledWith('notifications/resources/updated', {
				uri: 'resource://test/uri',
			});
		});

		it('should process multiple notifications in sequence', async () => {
			const mockEmitNotification = vi.fn();
			server.emitNotification = mockEmitNotification;

			await Promise.all([
				handler.emitPromptsListChanged('test-1'),
				handler.emitResourcesListChanged('test-2'),
				handler.emitToolsListChanged('test-3'),
			]);

			// Wait for all processing
			await new Promise((resolve) => setTimeout(resolve, 20));

			expect(mockEmitNotification).toHaveBeenCalledTimes(3);
			expect(mockEmitNotification).toHaveBeenCalledWith('notifications/prompts/list_changed', {});
			expect(mockEmitNotification).toHaveBeenCalledWith('notifications/resources/list_changed', {});
			expect(mockEmitNotification).toHaveBeenCalledWith('notifications/tools/list_changed', {});
		});
	});

	describe('Queue Management', () => {
		it('should maintain queue statistics', async () => {
			const stats = handler.getStats();

			expect(stats.queueSize).toBe(0);
			expect(stats.processing).toBe(false);
		});

		it('should show queue size during processing', async () => {
			// Mock slow processing
			const mockEmitNotification = vi.fn().mockImplementation(() => {
				return new Promise((resolve) => setTimeout(resolve, 50));
			});
			server.emitNotification = mockEmitNotification;

			// Start multiple notifications
			const promises = [
				handler.emitPromptsListChanged('test-1'),
				handler.emitResourcesListChanged('test-2'),
				handler.emitToolsListChanged('test-3'),
			];

			// Check stats during processing
			await new Promise((resolve) => setTimeout(resolve, 10));
			const processingStats = handler.getStats();

			expect(processingStats.queueSize).toBeGreaterThan(0);
			expect(processingStats.processing).toBe(true);

			// Wait for completion
			await Promise.all(promises);
		});

		it('should clear notification queue', () => {
			handler.clearQueue();

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('"event":"notification_queue_cleared"'),
			);
		});
	});

	describe('Notification Method Mapping', () => {
		it('should map notification types to correct MCP methods', () => {
			const handler = handler as any;
			const testCases: [NotificationEventType, string][] = [
				['prompts.list_changed', 'notifications/prompts/list_changed'],
				['resources.list_changed', 'notifications/resources/list_changed'],
				['resources.updated', 'notifications/resources/updated'],
				['tools.list_changed', 'notifications/tools/list_changed'],
			];

			testCases.forEach(([type, expectedMethod]) => {
				const method = handler.getNotificationMethod(type);
				expect(method).toBe(expectedMethod);
			});
		});

		it('should throw error for unknown notification types', () => {
			const handler = handler as any;

			expect(() => {
				handler.getNotificationMethod('unknown.type' as NotificationEventType);
			}).toThrow('Unknown notification type: unknown.type');
		});
	});

	describe('Error Handling', () => {
		it('should handle server emit errors gracefully', async () => {
			const mockEmitNotification = vi.fn().mockRejectedValue(new Error('Emit failed'));
			server.emitNotification = mockEmitNotification;

			// Should not throw, but should log the error
			await expect(handler.emitPromptsListChanged('test')).resolves.toBeUndefined();

			// Wait for processing attempt
			await new Promise((resolve) => setTimeout(resolve, 10));
		});

		it('should handle processing errors without affecting queue', async () => {
			const mockEmitNotification = vi
				.fn()
				.mockResolvedValueOnce(undefined)
				.mockRejectedValueOnce(new Error('Second emit failed'))
				.mockResolvedValueOnce(undefined);

			server.emitNotification = mockEmitNotification;

			await Promise.all([
				handler.emitPromptsListChanged('test-1'),
				handler.emitResourcesListChanged('test-2'),
				handler.emitToolsListChanged('test-3'),
			]);

			// Wait for processing
			await new Promise((resolve) => setTimeout(resolve, 20));

			// All should be attempted despite the error
			expect(mockEmitNotification).toHaveBeenCalledTimes(3);
		});
	});

	describe('Structured Logging', () => {
		it('should log with brAInwav branding', async () => {
			await handler.emitPromptsListChanged('test-correlation');

			expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('"brand":"brAInwav"'));
		});

		it('should include service name in logs', async () => {
			await handler.emitResourcesListChanged('test-correlation');

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('"service":"cortex-os-mcp-notification-handler"'),
			);
		});

		it('should include correlation IDs in logs', async () => {
			const correlationId = 'test-correlation-123';
			await handler.emitToolsListChanged(correlationId);

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining(`"correlationId":"${correlationId}"`),
			);
		});

		it('should log notification processing lifecycle', async () => {
			const mockEmitNotification = vi.fn();
			server.emitNotification = mockEmitNotification;

			await handler.emitPromptsListChanged('test-correlation');

			// Should log queuing
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('"event":"notification_queued"'),
			);

			// Wait for processing
			await new Promise((resolve) => setTimeout(resolve, 10));

			// Should log processing
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('"event":"notification_processing"'),
			);

			// Should log emission
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('"event":"notification_emitted"'),
			);
		});
	});

	describe('Factory Function', () => {
		it('should create notification handler with server', () => {
			const customServer = new Server();
			const customHandler = createMCPNotificationHandler(customServer);

			expect(customHandler).toBeInstanceOf(MCPNotificationHandler);
		});
	});
});

describe('Notifications Utility', () => {
	let server: Server;
	let notificationHandler: MCPNotificationHandler;
	let consoleSpy: any;

	beforeEach(() => {
		server = new Server();
		notificationHandler = createMCPNotificationHandler(server);
		consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
	});

	afterEach(() => {
		consoleSpy.mockRestore();
	});

	describe('Notifications.emitAllListChanged', () => {
		it('should emit all listChanged notifications', async () => {
			const correlationId = 'test-correlation-123';

			await Notifications.emitAllListChanged(notificationHandler, correlationId);

			// Verify all were queued
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('"type":"prompts.list_changed"'),
			);
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('"type":"resources.list_changed"'),
			);
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('"type":"tools.list_changed"'),
			);
		});

		it('should handle emission without correlation ID', async () => {
			await Notifications.emitAllListChanged(notificationHandler);

			// Should still emit all notifications
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('"type":"prompts.list_changed"'),
			);
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('"type":"resources.list_changed"'),
			);
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('"type":"tools.list_changed"'),
			);
		});
	});

	describe('Notifications.emitResourceChanges', () => {
		it('should emit resource changes with listChanged and updates', async () => {
			const uris = [
				'resource://test/file1.txt',
				'resource://test/file2.txt',
				'resource://test/file3.txt',
			];
			const correlationId = 'test-correlation-456';

			await Notifications.emitResourceChanges(notificationHandler, uris, correlationId);

			// Should emit listChanged
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('"type":"resources.list_changed"'),
			);

			// Should emit individual updates for each URI
			uris.forEach((uri) => {
				expect(consoleSpy).toHaveBeenCalledWith(
					expect.objectContaining({
						type: 'resources.updated',
						data: { uri },
					}),
				);
			});
		});

		it('should handle empty URI list', async () => {
			await Notifications.emitResourceChanges(notificationHandler, [], 'test-correlation');

			// Should still emit listChanged but no individual updates
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('"type":"resources.list_changed"'),
			);

			// Verify no individual updates were emitted
			const updateCalls = consoleSpy.mock.calls.filter((call) =>
				call[0].includes('"type":"resources.updated"'),
			);
			expect(updateCalls).toHaveLength(0);
		});

		it('should handle single URI', async () => {
			const uri = 'resource://test/single.txt';
			const correlationId = 'test-correlation-789';

			await Notifications.emitResourceChanges(notificationHandler, [uri], correlationId);

			// Should emit listChanged
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('"type":"resources.list_changed"'),
			);

			// Should emit single update
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'resources.updated',
					data: { uri },
				}),
			);
		});
	});
});

describe('Integration Scenarios', () => {
	it('should handle high-volume notification emissions', async () => {
		const server = new Server();
		const handler = createMCPNotificationHandler(server);
		const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

		// Mock server for faster processing
		const mockEmitNotification = vi.fn();
		server.emitNotification = mockEmitNotification;

		// Emit many notifications
		const notificationPromises = [];
		for (let i = 0; i < 100; i++) {
			notificationPromises.push(handler.emitPromptsListChanged(`test-${i}`));
		}

		// Wait for all to complete
		await Promise.all(notificationPromises);

		// Verify all were processed
		expect(mockEmitNotification).toHaveBeenCalledTimes(100);

		consoleSpy.mockRestore();
	});

	it('should handle mixed notification types in sequence', async () => {
		const server = new Server();
		const handler = createMCPNotificationHandler(server);
		const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

		const mockEmitNotification = vi.fn();
		server.emitNotification = mockEmitNotification;

		// Emit different types of notifications
		await handler.emitPromptsListChanged('correlation-1');
		await handler.emitResourcesUpdated('resource://test/1', 'correlation-2');
		await handler.emitToolsListChanged('correlation-3');
		await handler.emitResourcesListChanged('correlation-4');

		// Wait for processing
		await new Promise((resolve) => setTimeout(resolve, 20));

		// Verify all notification types were emitted
		expect(mockEmitNotification).toHaveBeenCalledWith('notifications/prompts/list_changed', {});
		expect(mockEmitNotification).toHaveBeenCalledWith('notifications/resources/updated', {
			uri: 'resource://test/1',
		});
		expect(mockEmitNotification).toHaveBeenCalledWith('notifications/tools/list_changed', {});
		expect(mockEmitNotification).toHaveBeenCalledWith('notifications/resources/list_changed', {});

		consoleSpy.mockRestore();
	});

	it('should maintain notification order within type', async () => {
		const server = new Server();
		const handler = createMCPNotificationHandler(server);
		const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

		const mockEmitNotification = vi.fn();
		server.emitNotification = mockEmitNotification;

		// Emit multiple prompts notifications in sequence
		await handler.emitPromptsListChanged('correlation-1');
		await handler.emitPromptsListChanged('correlation-2');
		await handler.emitPromptsListChanged('correlation-3');

		// Wait for processing
		await new Promise((resolve) => setTimeout(resolve, 20));

		// Verify all were processed
		expect(mockEmitNotification).toHaveBeenCalledTimes(3);

		// All should be prompts listChanged notifications
		mockEmitNotification.mock.calls.forEach((call) => {
			expect(call[0]).toBe('notifications/prompts/list_changed');
		});

		consoleSpy.mockRestore();
	});
});
