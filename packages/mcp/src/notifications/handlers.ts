/**
 * MCP Notification Handlers
 * Centralized handling of MCP notifications with proper event emission
 */

import { emitPromptsListChanged } from '../capabilities/prompts.js';
import { emitResourcesListChanged, emitResourcesUpdated } from '../capabilities/resources.js';
import { emitToolsListChanged } from '../capabilities/tools.js';
import type { Server, ServerLogger } from '../server.js';

/**
 * Notification event types
 */
export type NotificationEventType =
	| 'prompts.list_changed'
	| 'resources.list_changed'
	| 'resources.updated'
	| 'tools.list_changed';

/**
 * Notification event data
 */
export interface NotificationEvent {
	type: NotificationEventType;
	data?: any;
	timestamp: number;
	correlationId?: string;
}

const BACKPRESSURE_WARNING_SIZE = 3;

/**
 * MCP Notification Handler class
 * Manages emission of all MCP protocol notifications
 */
export class MCPNotificationHandler {
	private server: Server;
	private eventQueue: NotificationEvent[] = [];
	private processing = false;
	private logger: ServerLogger;
	private backpressureNotified = false;

	constructor(server: Server) {
		this.server = server;
		this.logger = server.getLogger();
	}

	/**
	 * Emit prompts listChanged notification
	 */
	async emitPromptsListChanged(correlationId?: string): Promise<void> {
		const event: NotificationEvent = {
			type: 'prompts.list_changed',
			timestamp: Date.now(),
			correlationId,
		};

		await this.queueAndProcess(event);
		emitPromptsListChanged(this.server);
	}

	/**
	 * Emit resources listChanged notification
	 */
	async emitResourcesListChanged(correlationId?: string): Promise<void> {
		const event: NotificationEvent = {
			type: 'resources.list_changed',
			timestamp: Date.now(),
			correlationId,
		};

		await this.queueAndProcess(event);
		emitResourcesListChanged(this.server);
	}

	/**
	 * Emit resources updated notification for specific URI
	 */
	async emitResourcesUpdated(uri: string, correlationId?: string): Promise<void> {
		const event: NotificationEvent = {
			type: 'resources.updated',
			data: { uri },
			timestamp: Date.now(),
			correlationId,
		};

		await this.queueAndProcess(event);
		emitResourcesUpdated(this.server, uri);
	}

	/**
	 * Emit tools listChanged notification
	 */
	async emitToolsListChanged(correlationId?: string): Promise<void> {
		const event: NotificationEvent = {
			type: 'tools.list_changed',
			timestamp: Date.now(),
			correlationId,
		};

		await this.queueAndProcess(event);
		emitToolsListChanged(this.server);
	}

	/**
	 * Queue notification event and process asynchronously
	 */
	private async queueAndProcess(event: NotificationEvent): Promise<void> {
		this.eventQueue.push(event);
		this.log('notification_queued', 'info', {
			type: event.type,
			data: event.data,
			queueSize: this.eventQueue.length,
			correlationId: event.correlationId,
		});

		if (this.eventQueue.length >= BACKPRESSURE_WARNING_SIZE && !this.backpressureNotified) {
			this.backpressureNotified = true;
			this.log('notification_backpressure', 'warn', {
				size: this.eventQueue.length,
				type: event.type,
			});
		}

		if (!this.processing) {
			void this.processQueue().catch((error) => {
				const message = error instanceof Error ? error.message : String(error);
				this.log('notification_processing_failed', 'error', { error: message });
			});
		}
	}

	/**
	 * Process queued notification events
	 */
	private async processQueue(): Promise<void> {
		if (this.processing || this.eventQueue.length === 0) {
			return;
		}

		this.processing = true;
		this.backpressureNotified = false;

		try {
			while (this.eventQueue.length > 0) {
				const event = this.eventQueue.shift();
				if (event) {
					await this.processNotification(event);
				}
			}
		} finally {
			this.processing = false;
		}
	}

	/**
	 * Process individual notification event
	 */
	private async processNotification(event: NotificationEvent): Promise<void> {
		this.log('notification_processing', 'debug', {
			type: event.type,
			data: event.data,
			correlationId: event.correlationId,
		});

		// Emit the actual notification through the server
		const notification = {
			method: this.getNotificationMethod(event.type),
			params: event.data || {},
		};

		try {
			await this.server.emitNotification?.(notification.method, notification.params);
			this.log('notification_emitted', 'info', {
				type: event.type,
				method: notification.method,
				params: notification.params,
				correlationId: event.correlationId,
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.log('notification_processing_failed', 'error', {
				type: event.type,
				correlationId: event.correlationId,
				error: message,
			});
		}
	}

	/**
	 * Get MCP notification method name for event type
	 */
	private getNotificationMethod(type: NotificationEventType): string {
		switch (type) {
			case 'prompts.list_changed':
				return 'notifications/prompts/list_changed';
			case 'resources.list_changed':
				return 'notifications/resources/list_changed';
			case 'resources.updated':
				return 'notifications/resources/updated';
			case 'tools.list_changed':
				return 'notifications/tools/list_changed';
			default:
				throw new Error(`Unknown notification type: ${type}`);
		}
	}

	/**
	 * Log structured events with brAInwav branding
	 */
	private log(event: string, level: 'info' | 'warn' | 'error' | 'debug', data?: any): void {
		const logEntry = {
			timestamp: new Date().toISOString(),
			event,
			brand: 'brAInwav',
			service: 'cortex-os-mcp-notification-handler',
			...data,
		};
		this.logger[level](logEntry);
	}

	/**
	 * Get notification handler statistics
	 */
	getStats(): {
		queueSize: number;
		processing: boolean;
	} {
		return {
			queueSize: this.eventQueue.length,
			processing: this.processing,
		};
	}

	/**
	 * Clear the notification queue
	 */
	clearQueue(): void {
		const clearedCount = this.eventQueue.length;
		this.eventQueue = [];

		this.log('notification_queue_cleared', 'info', {
			clearedCount,
		});
	}
}

/**
 * Factory function to create MCP notification handler
 */
export function createMCPNotificationHandler(server: Server): MCPNotificationHandler {
	return new MCPNotificationHandler(server);
}

/**
 * Utility functions for easy notification emission
 */
export const Notifications = {
	/**
	 * Emit all listChanged notifications (batch operation)
	 */
	async emitAllListChanged(handler: MCPNotificationHandler, correlationId?: string): Promise<void> {
		await Promise.all([
			handler.emitPromptsListChanged(correlationId),
			handler.emitResourcesListChanged(correlationId),
			handler.emitToolsListChanged(correlationId),
		]);
	},

	/**
	 * Emit notifications for specific resource changes
	 */
	async emitResourceChanges(
		handler: MCPNotificationHandler,
		uris: string[],
		correlationId?: string,
	): Promise<void> {
		await Promise.all([
			// Emit list changed for bulk changes
			handler.emitResourcesListChanged(correlationId),
			// Emit individual updates for each URI
			...uris.map((uri) => handler.emitResourcesUpdated(uri, correlationId)),
		]);
	},
};
