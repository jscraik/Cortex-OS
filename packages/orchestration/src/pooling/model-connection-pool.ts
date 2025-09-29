/**
 * Model Connection Pool Implementation
 * Manages connection pooling for model provider connections
 */

import { EventEmitter } from 'node:events';

export interface PoolConfig {
	minConnections?: number;
	maxConnections?: number;
	acquireTimeoutMs?: number;
	idleTimeoutMs?: number;
	testOnBorrow?: boolean;
	testOnReturn?: boolean;
	evictionRunIntervalMs?: number;
}

export interface ConnectionStats {
	total: number;
	active: number;
	idle: number;
	acquiring: number;
	destroyed: number;
}

export interface ConnectionInfo {
	id: string;
	createdAt: number;
	lastUsedAt: number;
	acquiredAt?: number;
	requestCount: number;
	errorCount: number;
}

export class ModelConnection {
	private readonly id: string;
	private readonly provider: string;
	private readonly createdAt: number;
	private lastUsedAt: number;
	private acquiredAt: number | null = null;
	private requestCount = 0;
	private errorCount = 0;
	private active = false;
	private destroyed = false;

	constructor(
		private readonly connection: any, // Actual connection object
		private readonly testFn?: () => Promise<boolean>,
	) {
		this.id = `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
		this.provider = connection.name || 'unknown';
		this.createdAt = Date.now();
		this.lastUsedAt = this.createdAt;
	}

	getId(): string {
		return this.id;
	}

	getProvider(): string {
		return this.provider;
	}

	isActive(): boolean {
		return this.active && !this.destroyed;
	}

	isIdle(): boolean {
		return !this.active && !this.destroyed;
	}

	isExpired(idleTimeoutMs: number): boolean {
		return this.isIdle() && Date.now() - this.lastUsedAt > idleTimeoutMs;
	}

	getConnection(): any {
		return this.connection;
	}

	getStats(): ConnectionInfo {
		return {
			id: this.id,
			createdAt: this.createdAt,
			lastUsedAt: this.lastUsedAt,
			acquiredAt: this.acquiredAt || undefined,
			requestCount: this.requestCount,
			errorCount: this.errorCount,
		};
	}

	async acquire(): Promise<void> {
		if (this.destroyed) {
			throw new Error(`Connection ${this.id} is destroyed`);
		}

		if (this.active) {
			throw new Error(`Connection ${this.id} is already acquired`);
		}

		this.active = true;
		this.acquiredAt = Date.now();
	}

	async release(): Promise<void> {
		if (!this.active) {
			throw new Error(`Connection ${this.id} is not acquired`);
		}

		this.active = false;
		this.acquiredAt = null;
		this.lastUsedAt = Date.now();
	}

	async test(): Promise<boolean> {
		if (this.testFn) {
			try {
				return await this.testFn();
			} catch {
				this.errorCount++;
				return false;
			}
		}
		return true;
	}

	async destroy(): Promise<void> {
		this.destroyed = true;
		this.active = false;

		// If the connection has a close method, call it
		if (typeof this.connection?.close === 'function') {
			try {
				await this.connection.close();
			} catch {
				// Ignore close errors
			}
		}
	}

	recordSuccess(): void {
		this.requestCount++;
		this.lastUsedAt = Date.now();
	}

	recordError(): void {
		this.errorCount++;
	}
}

export interface AcquireOptions {
	timeoutMs?: number;
	testOnBorrow?: boolean;
}

export class ModelConnectionPool extends EventEmitter {
	private readonly pools = new Map<string, ModelConnection[]>();
	private readonly waitingQueues = new Map<
		string,
		Array<{
			resolve: (conn: ModelConnection) => void;
			reject: (error: Error) => void;
			timeout: NodeJS.Timeout;
		}>
	>();
	private readonly config: Required<PoolConfig>;
	private evictionTimer?: NodeJS.Timeout;

	constructor(
		private readonly createConnectionFn: (provider: string) => Promise<any>,
		config: PoolConfig = {},
	) {
		super();

		this.config = {
			minConnections: 2,
			maxConnections: 10,
			acquireTimeoutMs: 30000,
			idleTimeoutMs: 300000, // 5 minutes
			testOnBorrow: true,
			testOnReturn: false,
			evictionRunIntervalMs: 60000, // 1 minute
			...config,
		};

		// Start eviction timer
		this.startEvictionTimer();
	}

	/**
	 * Acquire a connection from the pool
	 */
	async acquire(provider: string, options: AcquireOptions = {}): Promise<ModelConnection> {
		const pool = this.getPool(provider);
		const testOnBorrow = options.testOnBorrow ?? this.config.testOnBorrow;
		const timeoutMs = options.timeoutMs ?? this.config.acquireTimeoutMs;

		// Try to find an idle connection
		for (const connection of pool) {
			if (connection.isIdle()) {
				try {
					if (testOnBorrow) {
						const isHealthy = await connection.test();
						if (!isHealthy) {
							await this.destroyConnection(connection, provider);
							continue;
						}
					}

					await connection.acquire();
					this.emit('acquired', { provider, connectionId: connection.getId() });
					return connection;
				} catch {
					await this.destroyConnection(connection, provider);
				}
			}
		}

		// Create new connection if under limit
		if (pool.length < this.config.maxConnections) {
			try {
				const rawConnection = await this.createConnectionFn(provider);
				const connection = new ModelConnection(rawConnection, () =>
					this.testConnection(rawConnection),
				);

				// Add to pool
				pool.push(connection);
				await connection.acquire();

				this.emit('created', { provider, connectionId: connection.getId() });
				this.emit('acquired', { provider, connectionId: connection.getId() });
				return connection;
			} catch (error) {
				this.emit('error', new Error(`Failed to create connection for ${provider}: ${error}`));
			}
		}

		// Wait for available connection
		return this.waitForConnection(provider, timeoutMs);
	}

	/**
	 * Release a connection back to the pool
	 */
	async release(connection: ModelConnection): Promise<void> {
		const provider = connection.getProvider();
		// pool not required here; release logic operates on the connection instance

		// Test on return if enabled
		if (this.config.testOnReturn) {
			try {
				const isHealthy = await connection.test();
				if (!isHealthy) {
					await this.destroyConnection(connection, provider);
					this.emit('released', {
						provider,
						connectionId: connection.getId(),
						tested: true,
						healthy: false,
					});
					return;
				}
			} catch {
				await this.destroyConnection(connection, provider);
				this.emit('released', {
					provider,
					connectionId: connection.getId(),
					tested: true,
					healthy: false,
				});
				return;
			}
		}

		try {
			await connection.release();
			this.emit('released', {
				provider,
				connectionId: connection.getId(),
				tested: !!this.config.testOnReturn,
				healthy: true,
			});

			// Process waiting queue
			setImmediate(() => this.processWaitingQueue(provider).catch(console.error));
		} catch {
			await this.destroyConnection(connection, provider);
		}
	}

	/**
	 * Get pool statistics
	 */
	getStats(provider?: string): ConnectionStats | Record<string, ConnectionStats> {
		if (provider) {
			return this.calculateStats(this.getPool(provider));
		}

		const stats: Record<string, ConnectionStats> = {};
		for (const [p, pool] of this.pools) {
			stats[p] = this.calculateStats(pool);
		}
		return stats;
	}

	/**
	 * Get detailed connection information
	 */
	getConnectionInfo(provider?: string): ConnectionInfo[] {
		if (provider) {
			return this.getPool(provider).map((conn) => conn.getStats());
		}

		const allInfo: ConnectionInfo[] = [];
		for (const pool of this.pools.values()) {
			allInfo.push(...pool.map((conn) => conn.getStats()));
		}
		return allInfo;
	}

	/**
	 * Clear all connections
	 */
	async clear(provider?: string): Promise<void> {
		if (provider) {
			const pool = this.getPool(provider);
			await Promise.all(pool.map((conn) => this.destroyConnection(conn, provider)));
			pool.length = 0;
		} else {
			await Promise.all(
				Array.from(this.pools.entries()).map(([p, pool]) =>
					Promise.all(pool.map((conn) => this.destroyConnection(conn, p))),
				),
			);
			this.pools.clear();
		}
	}

	/**
	 * Destroy the pool
	 */
	async destroy(): Promise<void> {
		// Stop eviction timer
		if (this.evictionTimer) {
			clearInterval(this.evictionTimer);
			this.evictionTimer = undefined;
		}

		// Clear all waiting queues
		for (const [_provider, queue] of this.waitingQueues) {
			for (const waiter of queue) {
				clearTimeout(waiter.timeout);
				waiter.reject(new Error('Connection pool is being destroyed'));
			}
		}
		this.waitingQueues.clear();

		// Remove all event listeners to prevent memory leaks
		this.removeAllListeners();

		// Clear all connections
		await this.clear();
	}

	private getPool(provider: string): ModelConnection[] {
		if (!this.pools.has(provider)) {
			this.pools.set(provider, []);
			this.waitingQueues.set(provider, []);

			// Initialize minimum connections
			this.initializePool(provider);
		}
		return this.pools.get(provider)!;
	}

	private async initializePool(provider: string): Promise<void> {
		const pool = this.getPool(provider);
		const initialCount = Math.min(this.config.minConnections, this.config.maxConnections);

		const createPromises = Array(initialCount)
			.fill(null)
			.map(async () => {
				try {
					const rawConnection = await this.createConnectionFn(provider);
					const connection = new ModelConnection(rawConnection, () =>
						this.testConnection(rawConnection),
					);
					pool.push(connection);
					this.emit('initialized', { provider, connectionId: connection.getId() });
				} catch (error) {
					this.emit(
						'error',
						new Error(`Failed to initialize connection for ${provider}: ${error}`),
					);
				}
			});

		await Promise.all(createPromises);
	}

	private async waitForConnection(provider: string, timeoutMs: number): Promise<ModelConnection> {
		const queue = this.waitingQueues.get(provider)!;

		return new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				const index = queue.findIndex((w) => w.resolve === resolve);
				if (index !== -1) {
					queue.splice(index, 1);
				}
				reject(new Error(`Connection acquisition timeout after ${timeoutMs}ms`));
			}, timeoutMs);

			queue.push({
				resolve: (conn) => {
					clearTimeout(timeout);
					resolve(conn);
				},
				reject: (error) => {
					clearTimeout(timeout);
					reject(error instanceof Error ? error : new Error(String(error)));
				},
				timeout,
			});
		});
	}

	private async processWaitingQueue(provider: string): Promise<void> {
		const queue = this.waitingQueues.get(provider)!;
		const pool = this.getPool(provider);

		while (queue.length > 0) {
			const waiter = queue.shift()!;
			clearTimeout(waiter.timeout);

			try {
				const connection = await this.tryAcquireIdleConnection(provider, pool);
				waiter.resolve(connection);
			} catch (error) {
				waiter.reject(error instanceof Error ? error : new Error(String(error)));
			}
		}
	}

	private async tryAcquireIdleConnection(
		provider: string,
		pool: ModelConnection[],
	): Promise<ModelConnection> {
		// Try to find an idle connection
		for (const connection of pool) {
			if (connection.isIdle()) {
				try {
					if (this.config.testOnBorrow) {
						const isHealthy = await connection.test();
						if (!isHealthy) {
							await this.destroyConnection(connection, provider);
							continue;
						}
					}

					await connection.acquire();
					this.emit('acquired', { provider, connectionId: connection.getId() });
					return connection;
				} catch {
					await this.destroyConnection(connection, provider);
				}
			}
		}

		// No idle connection available
		throw new Error('No idle connections available');
	}

	private async destroyConnection(connection: ModelConnection, provider: string): Promise<void> {
		const pool = this.getPool(provider);
		const index = pool.indexOf(connection);

		if (index !== -1) {
			pool.splice(index, 1);
		}

		try {
			await connection.destroy();
			this.emit('destroyed', { provider, connectionId: connection.getId() });
		} catch (error) {
			this.emit('error', new Error(`Failed to destroy connection: ${error}`));
		}
	}

	private async testConnection(connection: unknown): Promise<boolean> {
		// Default test implementation
		if (typeof connection?.isAvailable === 'function') {
			return connection.isAvailable();
		}
		return true;
	}

	private calculateStats(pool: ModelConnection[]): ConnectionStats {
		const stats: ConnectionStats = {
			total: pool.length,
			active: 0,
			idle: 0,
			acquiring: 0,
			destroyed: 0,
		};

		for (const connection of pool) {
			if (connection.isActive()) {
				stats.active++;
			} else if (connection.isIdle()) {
				stats.idle++;
			}
		}

		return stats;
	}

	private startEvictionTimer(): void {
		this.evictionTimer = setInterval(() => {
			this.evictIdleConnections();
		}, this.config.evictionRunIntervalMs);
	}

	private async evictIdleConnections(): Promise<void> {
		for (const [provider, pool] of this.pools) {
			const connectionsToDestroy: ModelConnection[] = [];

			// Find expired connections
			for (const connection of pool) {
				if (connection.isExpired(this.config.idleTimeoutMs)) {
					connectionsToDestroy.push(connection);
				}
			}

			// Calculate how many to destroy while maintaining minimum
			const currentPoolSize = pool.length;
			const keepCount = Math.min(this.config.minConnections, currentPoolSize);
			const maxDestroy = Math.max(0, connectionsToDestroy.length - (currentPoolSize - keepCount));
			const toDestroy = connectionsToDestroy.slice(0, maxDestroy);

			// Destroy expired connections in parallel
			if (toDestroy.length > 0) {
				await Promise.all(
					toDestroy.map(async (conn) => {
						try {
							await this.destroyConnection(conn, provider);
						} catch (error) {
							this.emit('error', new Error(`Failed to evict connection: ${error}`));
						}
					}),
				);
			}

			// Replenish if below minimum (but don't overfill)
			if (pool.length < this.config.minConnections && pool.length < this.config.maxConnections) {
				try {
					await this.initializePool(provider);
				} catch (error) {
					this.emit('error', new Error(`Failed to replenish pool for ${provider}: ${error}`));
				}
			}
		}
	}
}

// Factory function
export function createModelConnectionPool(
	createConnectionFn: (provider: string) => Promise<any>,
	config?: PoolConfig,
): ModelConnectionPool {
	return new ModelConnectionPool(createConnectionFn, config);
}
