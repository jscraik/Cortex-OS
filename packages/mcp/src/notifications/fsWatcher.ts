import { type FSWatcher, watch } from 'chokidar';
import { debounce } from 'lodash-es';
import { emitPromptsListChanged } from '../capabilities/prompts.js';
import { emitResourcesListChanged, emitResourcesUpdated } from '../capabilities/resources.js';
import { emitToolsListChanged } from '../capabilities/tools.js';
import type { Server } from '../server.js';

/**
 * File system watcher configuration
 */
export interface FSWatcherConfig {
	promptsPath?: string;
	resourcesPath?: string;
	toolsPath?: string;
	debounceMs?: number;
	ignored?: string[];
}

/**
 * Watched event type
 */
type WatchedEventType = 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir';

/**
 * Debounced notification queue
 */
interface NotificationQueue {
	prompts: boolean;
	resources: boolean;
	tools: boolean;
	resourceUpdates: Set<string>;
}

/**
 * File system watcher for MCP resources with debounced notifications
 */
export class MCPFSWatcher {
	private watcher: FSWatcher | null = null;
	private config: Required<FSWatcherConfig>;
	private notificationQueue: NotificationQueue = {
		prompts: false,
		resources: false,
		tools: false,
		resourceUpdates: new Set(),
	};

	constructor(config: FSWatcherConfig = {}) {
		this.config = {
			promptsPath: config.promptsPath || 'prompts',
			resourcesPath: config.resourcesPath || 'resources',
			toolsPath: config.toolsPath || 'tools',
			debounceMs: config.debounceMs || 250,
			ignored: config.ignored || [
				'**/node_modules/**',
				'**/.git/**',
				'**/dist/**',
				'**/build/**',
				'**/*.tmp',
				'**/*.log',
			],
		};
	}

	/**
	 * Start watching configured paths
	 */
	start(server: Server): void {
		if (this.watcher) {
			this.stop();
		}

		const watchPaths = [
			this.config.promptsPath,
			this.config.resourcesPath,
			this.config.toolsPath,
		].filter(Boolean);

		this.watcher = watch(watchPaths, {
			ignored: this.config.ignored,
			persistent: true,
			ignoreInitial: true,
			awaitWriteFinish: {
				stabilityThreshold: 100,
				pollInterval: 50,
			},
		});

		// Setup debounced notification emitter
		const debouncedEmit = debounce(() => {
			this.flushNotifications(server);
		}, this.config.debounceMs);

		// Handle file system events
		this.watcher
			.on('all', (eventType: WatchedEventType, path: string) => {
				this.handleFileSystemEvent(eventType, path, debouncedEmit);
			})
			.on('error', (error: Error) => {
				this.logError('fs_watcher_error', error);
			});

		this.logStructured('fs_watcher_started', {
			paths: watchPaths,
			debounceMs: this.config.debounceMs,
		});
	}

	/**
	 * Stop watching
	 */
	stop(): void {
		if (this.watcher) {
			this.watcher.close();
			this.watcher = null;
			this.logStructured('fs_watcher_stopped', {});
		}
	}

	/**
	 * Handle file system events and queue appropriate notifications
	 */
	private handleFileSystemEvent(
		eventType: WatchedEventType,
		path: string,
		debouncedEmit: () => void,
	): void {
		const pathType = this.getPathType(path);

		if (!pathType) {
			return; // Path not in our watch list
		}

		this.logStructured('fs_event_detected', {
			eventType,
			path,
			pathType,
		});

		switch (pathType) {
			case 'prompts':
				this.queuePromptNotification();
				break;
			case 'resources':
				this.queueResourceNotification(eventType, path);
				break;
			case 'tools':
				this.queueToolNotification();
				break;
		}

		// Trigger debounced notification emission
		debouncedEmit();
	}

	/**
	 * Determine the type of path based on configuration
	 */
	private getPathType(path: string): 'prompts' | 'resources' | 'tools' | null {
		if (path.startsWith(this.config.promptsPath)) {
			return 'prompts';
		}
		if (path.startsWith(this.config.resourcesPath)) {
			return 'resources';
		}
		if (path.startsWith(this.config.toolsPath)) {
			return 'tools';
		}
		return null;
	}

	/**
	 * Queue a prompt listChanged notification
	 */
	private queuePromptNotification(): void {
		this.notificationQueue.prompts = true;
		this.logStructured('prompt_notification_queued', {});
	}

	/**
	 * Queue resource notifications
	 */
	private queueResourceNotification(eventType: WatchedEventType, path: string): void {
		// For add/unlink events, queue listChanged
		if (
			eventType === 'add' ||
			eventType === 'unlink' ||
			eventType === 'addDir' ||
			eventType === 'unlinkDir'
		) {
			this.notificationQueue.resources = true;
			this.logStructured('resource_list_notification_queued', { eventType, path });
		}

		// For change events, queue specific resource update
		if (eventType === 'change') {
			const uri = this.pathToResourceUri(path);
			if (uri) {
				this.notificationQueue.resourceUpdates.add(uri);
				this.logStructured('resource_update_notification_queued', { uri });
			}
		}
	}

	/**
	 * Queue a tool listChanged notification
	 */
	private queueToolNotification(): void {
		this.notificationQueue.tools = true;
		this.logStructured('tool_notification_queued', {});
	}

	/**
	 * Convert file path to resource URI
	 */
	private pathToResourceUri(path: string): string | null {
		// Convert file system path to resource URI
		// This is a simple implementation - could be enhanced
		if (path.startsWith(this.config.resourcesPath)) {
			const relativePath = path.substring(this.config.resourcesPath.length);
			return `resource://cortex-os${relativePath}`;
		}
		return null;
	}

	/**
	 * Flush all queued notifications
	 */
	private flushNotifications(server: Server): void {
		const notifications = [];

		if (this.notificationQueue.prompts) {
			emitPromptsListChanged(server);
			notifications.push('prompts.list_changed');
			this.notificationQueue.prompts = false;
		}

		if (this.notificationQueue.resources) {
			emitResourcesListChanged(server);
			notifications.push('resources.list_changed');
			this.notificationQueue.resources = false;
		}

		// Emit individual resource updates
		for (const uri of this.notificationQueue.resourceUpdates) {
			emitResourcesUpdated(server, uri);
			notifications.push(`resources.updated(${uri})`);
		}
		this.notificationQueue.resourceUpdates.clear();

		if (this.notificationQueue.tools) {
			emitToolsListChanged(server);
			notifications.push('tools.list_changed');
			this.notificationQueue.tools = false;
		}

		if (notifications.length > 0) {
			this.logStructured('notifications_flushed', {
				count: notifications.length,
				types: notifications,
			});
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
			service: 'cortex-os-mcp-fs-watcher',
			...data,
		};

		console.log(JSON.stringify(logEntry));
	}

	/**
	 * Log errors
	 */
	private logError(event: string, error: Error): void {
		this.logStructured(event, {
			error: error.message,
			stack: error.stack,
		});
	}

	/**
	 * Get watcher statistics
	 */
	getStats(): {
		watching: boolean;
		queuedNotifications: number;
		queuedResourceUpdates: number;
	} {
		return {
			watching: !!this.watcher,
			queuedNotifications: [
				this.notificationQueue.prompts,
				this.notificationQueue.resources,
				this.notificationQueue.tools,
			].filter(Boolean).length,
			queuedResourceUpdates: this.notificationQueue.resourceUpdates.size,
		};
	}
}

/**
 * Factory function to create and start an MCP file system watcher
 */
export function createMCPFSWatcher(config: FSWatcherConfig = {}): MCPFSWatcher {
	const watcher = new MCPFSWatcher(config);
	return watcher;
}

/**
 * Helper function to start watching with a server
 */
export function startMCPFSWatcher(server: Server, config: FSWatcherConfig = {}): MCPFSWatcher {
	const watcher = createMCPFSWatcher(config);
	watcher.start(server);
	return watcher;
}
