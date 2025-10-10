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

const createLoggerStub = () => ({
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
	debug: vi.fn(),
});

const getLogs = (
	logger: ReturnType<typeof createLoggerStub>,
	level: keyof ReturnType<typeof createLoggerStub>,
) => logger[level].mock.calls.map(([entry]) => entry);

describe('MCPNotificationHandler', () => {
	let server: Server;
	let handler: MCPNotificationHandler;
	let logger: ReturnType<typeof createLoggerStub>;

	beforeEach(() => {
		logger = createLoggerStub();
		server = new Server({ logger });
		handler = createMCPNotificationHandler(server);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('Basic Notification Emission', () => {
		it('should emit prompts listChanged notification', async () => {
			await handler.emitPromptsListChanged('test-correlation');

			const infoLogs = getLogs(logger, 'info');
			expect(infoLogs).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ event: 'notification_queued', type: 'prompts.list_changed' }),
					expect.objectContaining({ event: 'notification_emitted', type: 'prompts.list_changed' }),
				]),
			);
		});

		it('should emit resources listChanged notification', async () => {
			await handler.emitResourcesListChanged('test-correlation');

			const infoLogs = getLogs(logger, 'info');
			expect(infoLogs).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ event: 'notification_queued', type: 'resources.list_changed' }),
					expect.objectContaining({
						event: 'notification_emitted',
						type: 'resources.list_changed',
					}),
				]),
			);
		});

		it('should emit resources updated notification', async () => {
			await handler.emitResourcesUpdated('resource://test/example', 'test-correlation');

			const infoLogs = getLogs(logger, 'info');
			expect(infoLogs).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						event: 'notification_queued',
						type: 'resources.updated',
						data: { uri: 'resource://test/example' },
					}),
					expect.objectContaining({
						event: 'notification_emitted',
						type: 'resources.updated',
					}),
				]),
			);
		});

		it('should emit tools listChanged notification', async () => {
			await handler.emitToolsListChanged('test-correlation');

			const infoLogs = getLogs(logger, 'info');
			expect(infoLogs).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ event: 'notification_queued', type: 'tools.list_changed' }),
					expect.objectContaining({ event: 'notification_emitted', type: 'tools.list_changed' }),
				]),
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

		it('should log back-pressure warning when queue exceeds threshold', async () => {
			const mockEmitNotification = vi
				.fn()
				.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));
			server.emitNotification = mockEmitNotification;

			await Promise.all([
				handler.emitPromptsListChanged('bp-1'),
				handler.emitResourcesListChanged('bp-2'),
				handler.emitToolsListChanged('bp-3'),
				handler.emitPromptsListChanged('bp-4'),
				handler.emitResourcesUpdated('resource://bp/1', 'bp-5'),
			]);

			await new Promise((resolve) => setTimeout(resolve, 20));

			const warnLogs = getLogs(logger, 'warn');
			expect(warnLogs).toEqual(
				expect.arrayContaining([expect.objectContaining({ event: 'notification_backpressure' })]),
			);
		});

		it('should clear notification queue', () => {
			handler.clearQueue();

			const infoLogs = getLogs(logger, 'info');
			expect(infoLogs).toEqual(
				expect.arrayContaining([expect.objectContaining({ event: 'notification_queue_cleared' })]),
			);
		});
	});

	describe('Notification Method Mapping', () => {
		it('should map notification types to correct MCP methods', () => {
			const handlerUnderTest = handler as any;
			const testCases: [NotificationEventType, string][] = [
				['prompts.list_changed', 'notifications/prompts/list_changed'],
				['resources.list_changed', 'notifications/resources/list_changed'],
				['resources.updated', 'notifications/resources/updated'],
				['tools.list_changed', 'notifications/tools/list_changed'],
			];

			testCases.forEach(([type, expectedMethod]) => {
				const method = handlerUnderTest.getNotificationMethod(type);
				expect(method).toBe(expectedMethod);
			});
		});

		it('should throw error for unknown notification types', () => {
			const handlerUnderTest = handler as any;

			expect(() => {
				handlerUnderTest.getNotificationMethod('unknown.type' as NotificationEventType);
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

		it('logs processing errors with correlation identifiers', async () => {
			const mockEmitNotification = vi
				.fn()
				.mockRejectedValue(new Error('notification pipeline error'));
			server.emitNotification = mockEmitNotification;

			await handler.emitResourcesUpdated('resource://error', 'corr-error');
			await new Promise((resolve) => setTimeout(resolve, 10));

			const errorLogs = getLogs(logger, 'error');
			expect(errorLogs).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						event: 'notification_processing_failed',
						correlationId: 'corr-error',
						error: 'notification pipeline error',
					}),
				]),
			);
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

			const infoLogs = getLogs(logger, 'info');
			expect(infoLogs).toEqual(
				expect.arrayContaining([expect.objectContaining({ brand: 'brAInwav' })]),
			);
		});

		it('should include service name in logs', async () => {
			await handler.emitResourcesListChanged('test-correlation');

			const infoLogs = getLogs(logger, 'info');
			expect(infoLogs).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ service: 'cortex-os-mcp-notification-handler' }),
				]),
			);
		});

		it('should include correlation IDs in logs', async () => {
			const correlationId = 'test-correlation-123';
			await handler.emitToolsListChanged(correlationId);

			const infoLogs = getLogs(logger, 'info');
			expect(infoLogs).toEqual(
				expect.arrayContaining([expect.objectContaining({ correlationId })]),
			);
		});

		it('should log notification processing lifecycle', async () => {
			const mockEmitNotification = vi.fn();
			server.emitNotification = mockEmitNotification;

			await handler.emitPromptsListChanged('test-correlation');

			// Should log queuing
			const initialLogs = getLogs(logger, 'info');
			expect(initialLogs).toEqual(
				expect.arrayContaining([expect.objectContaining({ event: 'notification_queued' })]),
			);

			// Wait for processing to log debug + emitted events
			await new Promise((resolve) => setTimeout(resolve, 10));

			const debugLogs = getLogs(logger, 'debug');
			expect(debugLogs).toEqual(
				expect.arrayContaining([expect.objectContaining({ event: 'notification_processing' })]),
			);

			const emittedLogs = getLogs(logger, 'info');
			expect(emittedLogs).toEqual(
				expect.arrayContaining([expect.objectContaining({ event: 'notification_emitted' })]),
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
	let logger: ReturnType<typeof createLoggerStub>;

	beforeEach(() => {
		logger = createLoggerStub();
		server = new Server({ logger });
		notificationHandler = createMCPNotificationHandler(server);
	});

	describe('Notifications.emitAllListChanged', () => {
		it('should emit all listChanged notifications', async () => {
			const correlationId = 'test-correlation-123';

			await Notifications.emitAllListChanged(notificationHandler, correlationId);

			// Verify all were queued
			const infoLogs = getLogs(logger, 'info');
			expect(infoLogs).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ type: 'prompts.list_changed' }),
					expect.objectContaining({ type: 'resources.list_changed' }),
					expect.objectContaining({ type: 'tools.list_changed' }),
				]),
			);
		});

		it('should handle emission without correlation ID', async () => {
			await Notifications.emitAllListChanged(notificationHandler);

			// Should still emit all notifications
			const infoLogs = getLogs(logger, 'info');
			expect(infoLogs).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ type: 'prompts.list_changed' }),
					expect.objectContaining({ type: 'resources.list_changed' }),
					expect.objectContaining({ type: 'tools.list_changed' }),
				]),
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

			const infoLogs = getLogs(logger, 'info');
			expect(infoLogs).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ type: 'resources.list_changed' }),
					...uris.map((uri) =>
						expect.objectContaining({ type: 'resources.updated', data: { uri } }),
					),
				]),
			);
		});

		it('should handle empty URI list', async () => {
			await Notifications.emitResourceChanges(notificationHandler, [], 'test-correlation');

			const infoLogs = getLogs(logger, 'info');
			expect(infoLogs).toEqual(
				expect.arrayContaining([expect.objectContaining({ type: 'resources.list_changed' })]),
			);
			const updateLogs = infoLogs.filter((entry) => entry.type === 'resources.updated');
			expect(updateLogs).toHaveLength(0);
		});

		it('should handle single URI', async () => {
			const uri = 'resource://test/single.txt';
			const correlationId = 'test-correlation-789';

			await Notifications.emitResourceChanges(notificationHandler, [uri], correlationId);

			const infoLogs = getLogs(logger, 'info');
			expect(infoLogs).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ type: 'resources.list_changed' }),
					expect.objectContaining({ type: 'resources.updated', data: { uri } }),
				]),
			);
		});
	});
});

describe('Integration Scenarios', () => {
	it('should handle high-volume notification emissions', async () => {
		const logger = createLoggerStub();
		const server = new Server({ logger });
		const handler = createMCPNotificationHandler(server);

		const mockEmitNotification = vi.fn();
		server.emitNotification = mockEmitNotification;

		const notificationPromises: Array<Promise<void>> = [];
		for (let i = 0; i < 100; i++) {
			notificationPromises.push(handler.emitPromptsListChanged(`test-${i}`));
		}

		await Promise.all(notificationPromises);
		await new Promise((resolve) => setTimeout(resolve, 100));

		expect(mockEmitNotification).toHaveBeenCalledTimes(100);
	});

	it('should handle mixed notification types in sequence', async () => {
		const logger = createLoggerStub();
		const server = new Server({ logger });
		const handler = createMCPNotificationHandler(server);

		const mockEmitNotification = vi.fn();
		server.emitNotification = mockEmitNotification;

		await handler.emitPromptsListChanged('correlation-1');
		await handler.emitResourcesUpdated('resource://test/1', 'correlation-2');
		await handler.emitToolsListChanged('correlation-3');
		await handler.emitResourcesListChanged('correlation-4');

		await new Promise((resolve) => setTimeout(resolve, 20));

		expect(mockEmitNotification).toHaveBeenCalledWith('notifications/prompts/list_changed', {});
		expect(mockEmitNotification).toHaveBeenCalledWith('notifications/resources/updated', {
			uri: 'resource://test/1',
		});
		expect(mockEmitNotification).toHaveBeenCalledWith('notifications/tools/list_changed', {});
		expect(mockEmitNotification).toHaveBeenCalledWith('notifications/resources/list_changed', {});
	});

	it('should maintain notification order within type', async () => {
		const logger = createLoggerStub();
		const server = new Server({ logger });
		const handler = createMCPNotificationHandler(server);

		const mockEmitNotification = vi.fn();
		server.emitNotification = mockEmitNotification;

		await handler.emitPromptsListChanged('correlation-1');
		await handler.emitPromptsListChanged('correlation-2');
		await handler.emitPromptsListChanged('correlation-3');

		await new Promise((resolve) => setTimeout(resolve, 20));

		expect(mockEmitNotification).toHaveBeenCalledTimes(3);

		mockEmitNotification.mock.calls.forEach((call) => {
			expect(call[0]).toBe('notifications/prompts/list_changed');
		});
	});
});
