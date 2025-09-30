/**
 * brAInwav Graceful Shutdown Example
 * SIGTERM handling, connection draining, and clean shutdown
 *
 * Co-authored-by: brAInwav Development Team
 */

import { EventEmitter } from 'node:events';
import type { Server } from 'node:http';

interface ShutdownOptions {
	timeout: number;
	signals: string[];
	logger?: (message: string, data?: any) => void;
}

interface ShutdownTask {
	name: string;
	task: () => Promise<void>;
	timeout: number;
}

class BrAInwavGracefulShutdown extends EventEmitter {
	private isShuttingDown = false;
	private shutdownTasks: ShutdownTask[] = [];
	private activeConnections = new Set<any>();
	private options: ShutdownOptions;

	constructor(options: Partial<ShutdownOptions> = {}) {
		super();

		this.options = {
			timeout: options.timeout || 30000, // 30 seconds default
			signals: options.signals || ['SIGTERM', 'SIGINT'],
			logger: options.logger || this.defaultLogger,
		};

		this.setupSignalHandlers();
	}

	private defaultLogger(message: string, data?: any): void {
		const timestamp = new Date().toISOString();
		if (data) {
			console.log(`[brAInwav] ${timestamp} ${message}`, data);
		} else {
			console.log(`[brAInwav] ${timestamp} ${message}`);
		}
	}

	private setupSignalHandlers(): void {
		this.options.signals.forEach((signal) => {
			process.on(signal, () => {
				this.options.logger?.(`[brAInwav] Received ${signal}, initiating graceful shutdown...`);
				this.shutdown().catch((error) => {
					this.options.logger?.('[brAInwav] Error during shutdown:', error);
					process.exit(1);
				});
			});
		});

		// Handle uncaught exceptions
		process.on('uncaughtException', (error) => {
			this.options.logger?.('[brAInwav] Uncaught exception, shutting down:', error);
			this.shutdown().then(() => process.exit(1));
		});

		// Handle unhandled promise rejections
		process.on('unhandledRejection', (reason) => {
			this.options.logger?.('[brAInwav] Unhandled promise rejection, shutting down:', reason);
			this.shutdown().then(() => process.exit(1));
		});
	}

	/**
	 * Register a shutdown task
	 */
	addShutdownTask(name: string, task: () => Promise<void>, timeout = 10000): void {
		this.shutdownTasks.push({ name, task, timeout });
		this.options.logger?.(`[brAInwav] Registered shutdown task: ${name}`);
	}

	/**
	 * Track HTTP server for connection draining
	 */
	trackHttpServer(server: Server): void {
		// Track new connections
		server.on('connection', (connection) => {
			this.activeConnections.add(connection);

			connection.on('close', () => {
				this.activeConnections.delete(connection);
			});
		});

		// Add server shutdown task
		this.addShutdownTask(
			'http-server',
			async () => {
				return new Promise((resolve, reject) => {
					this.options.logger?.('[brAInwav] Closing HTTP server...');

					// Stop accepting new connections
					server.close((error) => {
						if (error) {
							reject(error);
						} else {
							this.options.logger?.('[brAInwav] HTTP server closed successfully');
							resolve();
						}
					});

					// Close existing connections gracefully
					this.drainConnections();
				});
			},
			15000,
		);
	}

	/**
	 * Track database connections
	 */
	trackDatabase(db: any, name = 'database'): void {
		this.addShutdownTask(name, async () => {
			this.options.logger?.(`[brAInwav] Closing ${name} connections...`);

			if (db.close) {
				await db.close();
			} else if (db.end) {
				await db.end();
			} else if (db.destroy) {
				await db.destroy();
			}

			this.options.logger?.(`[brAInwav] ${name} connections closed`);
		});
	}

	/**
	 * Track message queue connections
	 */
	trackMessageQueue(queue: any, name = 'message-queue'): void {
		this.addShutdownTask(name, async () => {
			this.options.logger?.(`[brAInwav] Closing ${name} connections...`);

			// Stop consuming messages
			if (queue.stop) {
				await queue.stop();
			}

			// Close connection
			if (queue.close) {
				await queue.close();
			}

			this.options.logger?.(`[brAInwav] ${name} connections closed`);
		});
	}

	/**
	 * Add custom cleanup task
	 */
	addCleanupTask(name: string, cleanup: () => Promise<void>): void {
		this.addShutdownTask(name, cleanup);
	}

	private drainConnections(): void {
		if (this.activeConnections.size === 0) {
			this.options.logger?.('[brAInwav] No active connections to drain');
			return;
		}

		this.options.logger?.(
			`[brAInwav] Draining ${this.activeConnections.size} active connections...`,
		);

		// Force close connections after timeout
		setTimeout(() => {
			this.activeConnections.forEach((connection) => {
				this.options.logger?.('[brAInwav] Force closing connection');
				connection.destroy();
			});
			this.activeConnections.clear();
		}, 5000);
	}

	/**
	 * Execute graceful shutdown
	 */
	async shutdown(): Promise<void> {
		if (this.isShuttingDown) {
			this.options.logger?.('[brAInwav] Shutdown already in progress...');
			return;
		}

		this.isShuttingDown = true;
		this.emit('shutdown-start');

		const shutdownStart = Date.now();
		this.options.logger?.('[brAInwav] Starting graceful shutdown sequence...');

		try {
			// Execute shutdown tasks in reverse order (LIFO)
			const tasks = [...this.shutdownTasks].reverse();

			for (const { name, task, timeout } of tasks) {
				this.options.logger?.(`[brAInwav] Executing shutdown task: ${name}`);

				try {
					await Promise.race([
						task(),
						new Promise((_, reject) =>
							setTimeout(() => reject(new Error(`Timeout after ${timeout}ms`)), timeout),
						),
					]);

					this.options.logger?.(`[brAInwav] Shutdown task completed: ${name}`);
				} catch (error) {
					this.options.logger?.(`[brAInwav] Shutdown task failed: ${name}`, error);
					// Continue with other tasks
				}
			}

			const shutdownTime = Date.now() - shutdownStart;
			this.options.logger?.(`[brAInwav] Graceful shutdown completed in ${shutdownTime}ms`);

			this.emit('shutdown-complete');
			process.exit(0);
		} catch (error) {
			this.options.logger?.('[brAInwav] Error during shutdown:', error);
			this.emit('shutdown-error', error);
			process.exit(1);
		}
	}

	/**
	 * Check if shutdown is in progress
	 */
	isShutdownInProgress(): boolean {
		return this.isShuttingDown;
	}
}

/**
 * Express.js middleware for shutdown handling
 */
export function createShutdownMiddleware(shutdown: BrAInwavGracefulShutdown) {
	return (_req: any, res: any, next: any) => {
		if (shutdown.isShutdownInProgress()) {
			res.status(503).json({
				error: 'Service shutting down',
				brainwav: 'brAInwav service is shutting down gracefully',
			});
			return;
		}
		next();
	};
}

/**
 * Usage Example with Express.js
 */
export function setupBrAInwavGracefulShutdown(server: Server, dependencies: any = {}) {
	const shutdown = new BrAInwavGracefulShutdown({
		timeout: 30000,
		logger: (message, data) => {
			// Custom brAInwav logger
			console.log(`[brAInwav] ${message}`, data || '');
		},
	});

	// Track HTTP server
	shutdown.trackHttpServer(server);

	// Track database if provided
	if (dependencies.database) {
		shutdown.trackDatabase(dependencies.database, 'postgres');
	}

	// Track Redis if provided
	if (dependencies.redis) {
		shutdown.trackDatabase(dependencies.redis, 'redis');
	}

	// Track message queue if provided
	if (dependencies.messageQueue) {
		shutdown.trackMessageQueue(dependencies.messageQueue, 'rabbitmq');
	}

	// Add custom cleanup tasks
	shutdown.addCleanupTask('cleanup-temp-files', async () => {
		console.log('[brAInwav] Cleaning up temporary files...');
		// Custom cleanup logic here
	});

	shutdown.addCleanupTask('flush-metrics', async () => {
		console.log('[brAInwav] Flushing metrics to monitoring system...');
		// Flush any pending metrics
	});

	// Handle shutdown events
	shutdown.on('shutdown-start', () => {
		console.log('[brAInwav] 🔄 Graceful shutdown initiated - brAInwav standards enforced');
	});

	shutdown.on('shutdown-complete', () => {
		console.log('[brAInwav] ✅ Graceful shutdown completed - brAInwav service stopped cleanly');
	});

	shutdown.on('shutdown-error', (error) => {
		console.error('[brAInwav] ❌ Shutdown error:', error);
	});

	return shutdown;
}

/**
 * Kubernetes-friendly shutdown configuration
 */
export const kubernetesShutdownConfig = {
	// Kubernetes sends SIGTERM, then waits terminationGracePeriodSeconds
	terminationGracePeriodSeconds: 30,

	// Pod lifecycle hooks
	preStop: {
		exec: {
			command: ['/bin/sh', '-c', 'sleep 5'], // Allow load balancer to update
		},
	},
};

/**
 * Complete usage example:
 *
 * ```typescript
 * import express from 'express';
 * import { setupBrAInwavGracefulShutdown, createShutdownMiddleware } from './graceful-shutdown';
 *
 * const app = express();
 *
 * // Your application setup...
 *
 * const server = app.listen(3000, () => {
 *   console.log('[brAInwav] Server started on port 3000');
 * });
 *
 * // Setup graceful shutdown
 * const shutdown = setupBrAInwavGracefulShutdown(server, {
 *   database: db,
 *   redis: redisClient,
 *   messageQueue: rabbitMQConnection,
 * });
 *
 * // Add shutdown middleware
 * app.use(createShutdownMiddleware(shutdown));
 * ```
 */

export default BrAInwavGracefulShutdown;
