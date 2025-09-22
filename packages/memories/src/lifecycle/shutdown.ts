import { logger } from '../logging/logger.js';
import type { MemoryStore } from '../ports/MemoryStore.js';

export interface ShutdownHandler {
	name: string;
	handler: () => Promise<void>;
	timeout?: number;
}

export class GracefulShutdown {
	private readonly handlers: ShutdownHandler[] = [];
	private isShuttingDown = false;

	register(name: string, handler: () => Promise<void>, timeout = 30000): void {
		this.handlers.push({ name, handler, timeout });
	}

	async shutdown(signal: string): Promise<void> {
		if (this.isShuttingDown) {
			logger.warn('Shutdown already in progress');
			return;
		}

		this.isShuttingDown = true;
		logger.info({ signal }, 'Initiating graceful shutdown');

		const shutdownPromises = this.handlers.map(async ({ name, handler, timeout }) => {
			try {
				logger.info({ handler: name }, 'Starting shutdown handler');

				await Promise.race([
					handler(),
					new Promise((_, reject) =>
						setTimeout(() => reject(new Error(`Handler ${name} timed out`)), timeout)
					)
				]);

				logger.info({ handler: name }, 'Shutdown handler completed');
			} catch (error) {
				logger.error({ handler: name, error }, 'Shutdown handler failed');
			}
		});

		try {
			await Promise.all(shutdownPromises);
			logger.info('All shutdown handlers completed');
		} catch (error) {
			logger.error({ error }, 'Some shutdown handlers failed');
		}

		logger.info('Graceful shutdown complete');
		process.exit(0);
	}
}

export const gracefulShutdown = new GracefulShutdown();

// Register default signal handlers
process.on('SIGTERM', () => gracefulShutdown.shutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown.shutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
	logger.error({ error }, 'Uncaught exception');
	gracefulShutdown.shutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason) => {
	logger.error({ reason }, 'Unhandled promise rejection');
	gracefulShutdown.shutdown('unhandledRejection');
});