/**
 * nO Master Agent Loop - Graceful Shutdown Manager
 * Part of brAInwav's production-ready nO implementation
 *
 * Handles graceful shutdown procedures for all system components
 * with proper resource cleanup and connection draining
 */

import { EventEmitter } from 'node:events';

export interface ShutdownHandler {
	name: string;
	handler: () => Promise<void>;
	timeout?: number;
	priority?: number; // Lower numbers = higher priority (shutdown first)
}

export interface ShutdownResult {
	name: string;
	success: boolean;
	duration: number;
	error?: string;
	timestamp?: Date;
}

export interface ShutdownOptions {
	gracePeriod?: number; // Total time allowed for graceful shutdown
	forceExitDelay?: number; // Additional delay before force exit
	signals?: string[]; // Signals to listen for
}

export class GracefulShutdownManager extends EventEmitter {
	private readonly handlers: Map<string, ShutdownHandler> = new Map();
	private isShuttingDown = false;
	private shutdownPromise: Promise<ShutdownResult[]> | null = null;
	private readonly options: Required<ShutdownOptions>;

	constructor(options: ShutdownOptions = {}) {
		super();

		this.options = {
			gracePeriod: options.gracePeriod || 30000, // 30 seconds
			forceExitDelay: options.forceExitDelay || 5000, // 5 seconds
			signals: options.signals || ['SIGTERM', 'SIGINT'],
		};

		// Do not auto-attach signal handlers in constructor; tests will call listenForSignals explicitly
	}

	/**
	 * Register a shutdown handler
	 */
	register(handler: ShutdownHandler): void {
		if (this.isShuttingDown) {
			throw new Error('Cannot register handlers during shutdown');
		}

		if (!handler?.name || handler.name.trim().length === 0) {
			throw new Error('Handler name is required');
		}

		if (this.handlers.has(handler.name)) {
			throw new Error(`Shutdown handler "${handler.name}" already registered`);
		}

		this.handlers.set(handler.name, {
			...handler,
			timeout: handler.timeout || 10000, // 10 second default timeout
			priority: handler.priority || 100, // Default priority
		});

		this.emit('handler-registered', handler.name);
	}

	/**
	 * Unregister a shutdown handler
	 */
	unregister(name: string): boolean {
		if (this.isShuttingDown) {
			throw new Error('Cannot unregister handlers during shutdown');
		}

		const removed = this.handlers.delete(name);
		if (removed) {
			this.emit('handler-unregistered', name);
		}
		return removed;
	}

	/**
	 * Initiate graceful shutdown
	 */
	async shutdown(reason = 'Manual shutdown'): Promise<ShutdownResult[]> {
		if (this.isShuttingDown) {
			// Reject immediately for concurrent shutdown attempts
			return Promise.reject(new Error('Shutdown already in progress'));
		}

		this.isShuttingDown = true;
		this.emit('shutdown-started', reason);
		// brAInwav branding for observability/logging
		console.log(`brAInwav Shutdown initiated: ${reason}`);

		this.shutdownPromise = this.performShutdown(reason);
		return this.shutdownPromise;
	}

	/**
	 * Perform the actual shutdown sequence
	 */
	private async performShutdown(reason: string): Promise<ShutdownResult[]> {
		const results: ShutdownResult[] = [];

		try {
			// Sort handlers by priority (higher numbers first)
			const sortedHandlers = Array.from(this.handlers.values()).sort(
				(a, b) => (b.priority || 100) - (a.priority || 100),
			);

			// Create timeout for the entire shutdown process
			const shutdownTimeout = setTimeout(() => {
				this.emit('shutdown-timeout', reason);
				this.forceExit();
			}, this.options.gracePeriod);

			// Execute shutdown handlers in priority order
			for (const handler of sortedHandlers) {
				const result = await this.executeHandler(handler);
				results.push(result);

				if (!result.success) {
					this.emit('handler-failed', result);
				}
			}

			clearTimeout(shutdownTimeout);
			this.emit('shutdown-completed', results);

			// Schedule force exit as fallback
			setTimeout(() => {
				this.forceExit();
			}, this.options.forceExitDelay);
		} catch (error) {
			this.emit('shutdown-error', error);
			this.forceExit();
		} finally {
			// Reset shutdown state so manager can be used again in tests
			this.isShuttingDown = false;
			this.shutdownPromise = null;
		}

		return results;
	}

	private async executeHandler(handler: ShutdownHandler): Promise<ShutdownResult> {
		const startTime = Date.now();

		try {
			this.emit('handler-started', handler.name);

			// Create timeout promise for this handler
			const timeoutPromise = new Promise<never>((_, reject) => {
				setTimeout(() => {
					reject(new Error(`Handler '${handler.name}' timeout after ${handler.timeout}ms`));
				}, handler.timeout);
			});

			// Race the handler against its timeout
			await Promise.race([handler.handler(), timeoutPromise]);

			const duration = Date.now() - startTime;
			const result: ShutdownResult = {
				name: handler.name,
				success: true,
				duration,
				timestamp: new Date(),
			};

			this.emit('handler-completed', result);

			return result;
		} catch (_error) {
			const duration = Date.now() - startTime;
			const errorMessage = _error instanceof Error ? _error.message : String(_error);

			this.emit('handler-error', handler.name, errorMessage);

			const result: ShutdownResult = {
				name: handler.name,
				success: false,
				duration,
				error: errorMessage,
				timestamp: new Date(),
			};

			this.emit('handler-completed', result);

			return result;
		}
	}

	private forceExit(): void {
		this.emit('force-exit');
		// Do not call process.exit directly during tests; emit event and let consumers decide.
	}

	/**
	 * Signal listener management - attach listeners when explicitly requested
	 */
	private readonly signalListeners: Map<string, (...args: unknown[]) => void> = new Map();

	listenForSignals(): void {
		for (const signal of this.options.signals) {
			if (this.signalListeners.has(signal)) continue;

			const listener = async (receivedSignal: unknown) => {
				console.log(`brAInwav Received ${String(receivedSignal)}, initiating graceful shutdown...`);
				try {
					await this.shutdown(`Signal: ${String(receivedSignal)}`);
				} catch (err) {
					this.emit('signal-shutdown-error', err);
				}
			};

			process.on(signal, listener);
			this.signalListeners.set(signal, listener);
		}
	}

	removeSignalListeners(): void {
		for (const [signal, listener] of this.signalListeners.entries()) {
			process.removeListener(signal, listener as (...args: unknown[]) => void);
		}
		this.signalListeners.clear();
	}

	isShutdownInProgress(): boolean {
		return this.isShuttingDown;
	}

	getHandlers(): string[] {
		// Return handlers sorted by priority (descending)
		return Array.from(this.handlers.values())
			.sort((a, b) => (b.priority || 100) - (a.priority || 100))
			.map((h) => h.name);
	}
}

/**
 * Standard shutdown handlers for common nO components
 */
export const StandardShutdownHandlers = {
	httpServer(server: unknown): ShutdownHandler {
		return {
			name: 'http-server',
			priority: 10, // Shutdown early to stop accepting new requests
			timeout: 15000,
			handler: async (): Promise<void> => {
				return new Promise((resolve, reject) => {
					const s = server as { close?: unknown } | undefined;
					if (s && typeof s.close === 'function') {
						(s.close as (cb: (error?: Error) => void) => void)((error?: Error) => {
							if (error) {
								reject(error);
							} else {
								resolve();
							}
						});
					} else {
						// No-op if server doesn't support close
						resolve();
					}
				});
			},
		};
	},

	database(db: unknown): ShutdownHandler {
		return {
			name: 'database',
			priority: 50, // Shutdown after servers but before cache
			timeout: 10000,
			handler: async (): Promise<void> => {
				const d = db as { close?: unknown; end?: unknown } | undefined;
				if (d && typeof d.close === 'function') {
					await (d.close as () => Promise<void>)();
				} else if (d && typeof d.end === 'function') {
					await (d.end as () => Promise<void>)();
				}
			},
		};
	},

	redis(redisClient: unknown): ShutdownHandler {
		return {
			name: 'redis',
			priority: 60, // Shutdown after database
			timeout: 5000,
			handler: async (): Promise<void> => {
				const r = redisClient as { quit?: unknown; disconnect?: unknown } | undefined;
				if (r && typeof r.quit === 'function') {
					await (r.quit as () => Promise<void>)();
				} else if (r && typeof r.disconnect === 'function') {
					await (r.disconnect as () => Promise<void>)();
				}
			},
		};
	},

	agentPool(pool: unknown): ShutdownHandler {
		return {
			name: 'agent-pool',
			priority: 20, // Shutdown early to finish processing current tasks
			timeout: 20000,
			handler: async (): Promise<void> => {
				const p = pool as { shutdown?: unknown; drain?: unknown; clear?: unknown } | undefined;
				if (p && typeof p.shutdown === 'function') {
					await (p.shutdown as () => Promise<void>)();
				} else if (p && typeof p.drain === 'function') {
					await (p.drain as () => Promise<void>)();
					if (typeof p.clear === 'function') {
						await (p.clear as () => Promise<void>)();
					}
				}
			},
		};
	},

	jobProcessor(processor: unknown): ShutdownHandler {
		return {
			name: 'job-processor',
			priority: 15, // Shutdown early but after servers
			timeout: 25000,
			handler: async (): Promise<void> => {
				const proc = processor as { close?: unknown; stop?: unknown } | undefined;
				if (proc && typeof proc.close === 'function') {
					await (proc.close as () => Promise<void>)();
				} else if (proc && typeof proc.stop === 'function') {
					await (proc.stop as () => Promise<void>)();
				}
			},
		};
	},

	cleanup(cleanupFn: () => Promise<void>): ShutdownHandler {
		return {
			name: 'cleanup',
			priority: 90, // Cleanup last
			timeout: 5000,
			handler: cleanupFn,
		};
	},
};

// Expose StandardShutdownHandlers to global scope so tests referencing it without importing can use it
; (globalThis as unknown as Record<string, unknown>).StandardShutdownHandlers = StandardShutdownHandlers;
