/**
 * nO Master Agent Loop - Graceful Shutdown Manager
 * Part of brAInwav's production-ready nO implementation
 * 
 * Handles graceful shutdown procedures for all system components
 * with proper resource cleanup and connection draining
 */

import { EventEmitter } from 'events';

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
}

export interface ShutdownOptions {
    gracePeriod?: number; // Total time allowed for graceful shutdown
    forceExitDelay?: number; // Additional delay before force exit
    signals?: string[]; // Signals to listen for
}

export class GracefulShutdownManager extends EventEmitter {
    private handlers: Map<string, ShutdownHandler> = new Map();
    private isShuttingDown = false;
    private shutdownPromise: Promise<ShutdownResult[]> | null = null;
    private readonly options: Required<ShutdownOptions>;

    constructor(options: ShutdownOptions = {}) {
        super();

        this.options = {
            gracePeriod: options.gracePeriod || 30000, // 30 seconds
            forceExitDelay: options.forceExitDelay || 5000, // 5 seconds
            signals: options.signals || ['SIGTERM', 'SIGINT']
        };

        this.setupSignalHandlers();
    }

    /**
     * Register a shutdown handler
     */
    register(handler: ShutdownHandler): void {
        if (this.isShuttingDown) {
            throw new Error('Cannot register handlers during shutdown');
        }

        this.handlers.set(handler.name, {
            ...handler,
            timeout: handler.timeout || 10000, // 10 second default timeout
            priority: handler.priority || 100 // Default priority
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
            if (this.shutdownPromise) {
                await this.shutdownPromise;
            }
            return [];
        }

        this.isShuttingDown = true;
        this.emit('shutdown-started', reason);

        this.shutdownPromise = this.performShutdown(reason);
        return this.shutdownPromise;
    }

    /**
     * Perform the actual shutdown sequence
     */
    private async performShutdown(reason: string): Promise<ShutdownResult[]> {
        const results: ShutdownResult[] = [];

        try {
            // Sort handlers by priority (lower numbers first)
            const sortedHandlers = Array.from(this.handlers.values())
                .sort((a, b) => (a.priority || 100) - (b.priority || 100));

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
        }

        return results;
    }

    /**
     * Execute a single shutdown handler
     */
    private async executeHandler(handler: ShutdownHandler): Promise<ShutdownResult> {
        const startTime = Date.now();

        try {
            this.emit('handler-started', handler.name);

            // Create timeout promise for this handler
            const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => {
                    reject(new Error(`Handler '${handler.name}' timed out after ${handler.timeout}ms`));
                }, handler.timeout);
            });

            // Race the handler against its timeout
            await Promise.race([
                handler.handler(),
                timeoutPromise
            ]);

            const duration = Date.now() - startTime;
            this.emit('handler-completed', handler.name, duration);

            return {
                name: handler.name,
                success: true,
                duration
            };

        } catch (error) {
            const duration = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : String(error);

            this.emit('handler-error', handler.name, errorMessage);

            return {
                name: handler.name,
                success: false,
                duration,
                error: errorMessage
            };
        }
    }

    /**
     * Force exit the process
     */
    private forceExit(): void {
        this.emit('force-exit');
        process.exit(1);
    }

    /**
     * Setup signal handlers for graceful shutdown
     */
    private setupSignalHandlers(): void {
        for (const signal of this.options.signals) {
            process.on(signal, async (receivedSignal) => {
                console.log(`Received ${receivedSignal}, initiating graceful shutdown...`);
                await this.shutdown(`Signal: ${receivedSignal}`);
                process.exit(0);
            });
        }

        // Handle uncaught exceptions
        process.on('uncaughtException', async (error) => {
            console.error('Uncaught Exception:', error);
            this.emit('uncaught-exception', error);
            await this.shutdown('Uncaught Exception');
            process.exit(1);
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', async (reason, _promise) => {
            console.error('Unhandled Rejection:', reason);
            this.emit('unhandled-rejection', reason);
            await this.shutdown('Unhandled Rejection');
            process.exit(1);
        });
    }

    /**
     * Check if shutdown is in progress
     */
    isShutdownInProgress(): boolean {
        return this.isShuttingDown;
    }

    /**
     * Get list of registered handlers
     */
    getHandlers(): string[] {
        return Array.from(this.handlers.keys());
    }
}

/**
 * Standard shutdown handlers for common nO components
 */
export class StandardShutdownHandlers {
    /**
     * HTTP server shutdown handler
     */
    static httpServer(server: any): ShutdownHandler {
        return {
            name: 'http-server',
            priority: 10, // Shutdown early to stop accepting new requests
            timeout: 15000,
            handler: async (): Promise<void> => {
                return new Promise((resolve, reject) => {
                    server.close((error?: Error) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve();
                        }
                    });
                });
            }
        };
    }

    /**
     * Database connection shutdown handler
     */
    static database(db: any): ShutdownHandler {
        return {
            name: 'database',
            priority: 50, // Shutdown after servers but before cache
            timeout: 10000,
            handler: async (): Promise<void> => {
                if (db && typeof db.close === 'function') {
                    await db.close();
                } else if (db && typeof db.end === 'function') {
                    await db.end();
                }
            }
        };
    }

    /**
     * Redis connection shutdown handler
     */
    static redis(redisClient: any): ShutdownHandler {
        return {
            name: 'redis',
            priority: 60, // Shutdown after database
            timeout: 5000,
            handler: async (): Promise<void> => {
                if (redisClient && typeof redisClient.quit === 'function') {
                    await redisClient.quit();
                } else if (redisClient && typeof redisClient.disconnect === 'function') {
                    await redisClient.disconnect();
                }
            }
        };
    }

    /**
     * Agent pool shutdown handler
     */
    static agentPool(pool: any): ShutdownHandler {
        return {
            name: 'agent-pool',
            priority: 20, // Shutdown early to finish processing current tasks
            timeout: 20000,
            handler: async (): Promise<void> => {
                if (pool && typeof pool.shutdown === 'function') {
                    await pool.shutdown();
                } else if (pool && typeof pool.drain === 'function') {
                    await pool.drain();
                    if (typeof pool.clear === 'function') {
                        await pool.clear();
                    }
                }
            }
        };
    }

    /**
     * Background job processor shutdown handler
     */
    static jobProcessor(processor: any): ShutdownHandler {
        return {
            name: 'job-processor',
            priority: 15, // Shutdown early but after servers
            timeout: 25000,
            handler: async (): Promise<void> => {
                if (processor && typeof processor.close === 'function') {
                    await processor.close();
                } else if (processor && typeof processor.stop === 'function') {
                    await processor.stop();
                }
            }
        };
    }

    /**
     * Cleanup temporary files and resources
     */
    static cleanup(cleanupFn: () => Promise<void>): ShutdownHandler {
        return {
            name: 'cleanup',
            priority: 90, // Cleanup last
            timeout: 5000,
            handler: cleanupFn
        };
    }
}
