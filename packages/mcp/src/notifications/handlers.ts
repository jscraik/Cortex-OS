/**
 * MCP Notification Handlers
 * Centralized handling of MCP notifications with proper event emission
 */

import { emitPromptsListChanged } from '../capabilities/prompts.js';
import { emitResourcesListChanged, emitResourcesUpdated } from '../capabilities/resources.js';
import { emitToolsListChanged } from '../capabilities/tools.js';
import type { Server } from '../server.js';

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

/**
 * MCP Notification Handler class
 * Manages emission of all MCP protocol notifications
 */
export class MCPNotificationHandler {
	private server: Server;
	private eventQueue: NotificationEvent[] = [];
	private processing = false;

	constructor(server: Server) {
		this.server = server;
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
		this.logStructured('notification_queued', {
			type: event.type,
			data: event.data,
			queueSize: this.eventQueue.length,
		});

		if (!this.processing) {
			await this.processQueue();
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
		this.logStructured('notification_processing', {
			type: event.type,
			data: event.data,
			correlationId: event.correlationId,
		});

		// Emit the actual notification through the server
		const notification = {
			method: this.getNotificationMethod(event.type),
			params: event.data || {},
		};

		// In a real implementation, this would use the server's transport
		// For now, we'll emit through the server's notification system
		this.server.emitNotification?.(notification.method, notification.params);

		this.logStructured('notification_emitted', {
			type: event.type,
			method: notification.method,
			params: notification.params,
		});
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
	private logStructured(event: string, data: any): void {
		const logEntry = {
			timestamp: new Date().toISOString(),
			event,
			brand: 'brAInwav',
			service: 'cortex-os-mcp-notification-handler',
			...data,
		};

		console.log(JSON.stringify(logEntry));
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

		this.logStructured('notification_queue_cleared', {
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
