import { z } from 'zod';

/**
 * nO Master Agent Loop - Connection Pool Manager
 *
 * Provides intelligent connection pooling for HTTP requests, database connections,
 * and other network resources to optimize performance and resource utilization.
 *
 * Co-authored-by: brAInwav Development Team
 */

export interface PoolConfig {
	min: number;
	max: number;
	acquireTimeoutMs: number;
	idleTimeoutMs: number;
	reapIntervalMs: number;
	createTimeoutMs: number;
	destroyTimeoutMs: number;
	logLevel: 'none' | 'error' | 'warn' | 'info' | 'debug';
	testOnBorrow: boolean;
	testOnReturn: boolean;
	testOnIdle: boolean;
}

export interface PoolStats {
	total: number;
	idle: number;
	busy: number;
	pending: number;
	created: number;
	destroyed: number;
	borrowed: number;
	returned: number;
	failed: number;
}

export interface Resource {
	id: string;
	createdAt: number;
	lastUsed: number;
	usageCount: number;
	isHealthy: boolean;
}

/**
 * Generic Connection Pool
 */
export class ConnectionPool<T extends Resource> {
	private config: PoolConfig;
	private factory: {
		create: () => Promise<T>;
		destroy: (resource: T) => Promise<void>;
		validate: (resource: T) => Promise<boolean>;
	};

	private resources: Set<T> = new Set();
	private idleResources: T[] = [];
	private borrowedResources: Set<T> = new Set();
	private pendingCreates: Promise<T>[] = [];
	private waitingQueue: Array<{
		resolve: (resource: T) => void;
		reject: (error: Error) => void;
		timestamp: number;
	}> = [];

	private stats: PoolStats = {
		total: 0,
		idle: 0,
		busy: 0,
		pending: 0,
		created: 0,
		destroyed: 0,
		borrowed: 0,
		returned: 0,
		failed: 0,
	};

	private reapInterval?: NodeJS.Timeout;

	constructor(
		config: PoolConfig,
		factory: {
			create: () => Promise<T>;
			destroy: (resource: T) => Promise<void>;
			validate: (resource: T) => Promise<boolean>;
		},
	) {
		// Validate configuration at runtime and apply defaults
		try {
			PoolConfigSchema.parse(config);
		} catch (err) {
			this.emitError(err);
		}

		this.config = {
			...defaultPoolConfig,
			...(config as Partial<PoolConfig>),
		};
		this.factory = factory;
		this.startReaper();
		this.ensureMinimum();
	}

	/**
	 * Acquire a resource from the pool
	 */
	async acquire(): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			const timeout = setTimeout(() => {
				this.removeFromWaitingQueue(resolve);
				reject(new Error(`Acquire timeout after ${this.config.acquireTimeoutMs}ms`));
			}, this.config.acquireTimeoutMs);

			const wrappedResolve = (resource: T) => {
				clearTimeout(timeout);
				resolve(resource);
			};

			const wrappedReject = (error: Error) => {
				clearTimeout(timeout);
				reject(error);
			};

			this.tryAcquire(wrappedResolve, wrappedReject);
		});
	}

	/**
	 * Return a resource to the pool
	 */
	async release(resource: T): Promise<void> {
		if (!this.borrowedResources.has(resource)) {
			this.log('warn', 'Attempted to release resource not in borrowed set');
			return;
		}

		this.borrowedResources.delete(resource);
		this.stats.returned++;
		resource.lastUsed = Date.now();

		try {
			// Test resource health if configured
			if (this.config.testOnReturn) {
				const isValid = await this.factory.validate(resource);
				if (!isValid) {
					resource.isHealthy = false;
					await this.destroyResource(resource);
					this.ensureMinimum();
					return;
				}
			}

			// Return to idle pool
			this.idleResources.push(resource);
			this.updateStats();

			// Serve waiting requests
			this.processWaitingQueue();
		} catch (error) {
			this.log('error', 'Error returning resource to pool:', error);
			await this.destroyResource(resource);
			this.ensureMinimum();
		}
	}

	/**
	 * Destroy a specific resource
	 */
	async destroy(resource: T): Promise<void> {
		if (this.borrowedResources.has(resource)) {
			this.borrowedResources.delete(resource);
		}

		const idleIndex = this.idleResources.indexOf(resource);
		if (idleIndex > -1) {
			this.idleResources.splice(idleIndex, 1);
		}

		await this.destroyResource(resource);
		this.ensureMinimum();
	}

	/**
	 * Drain the pool (destroy all resources)
	 */
	async drain(): Promise<void> {
		// Clear reaper interval
		if (this.reapInterval) {
			clearInterval(this.reapInterval);
			this.reapInterval = undefined;
		}

		// Reject all waiting requests
		this.waitingQueue.forEach(({ reject }) => {
			reject(new Error('Pool is draining'));
		});
		this.waitingQueue = [];

		// Destroy all idle resources
		const idleToDestroy = [...this.idleResources];
		this.idleResources = [];

		for (const resource of idleToDestroy) {
			await this.destroyResource(resource);
		}

		// Wait for borrowed resources to be returned or timeout
		const borrowed = Array.from(this.borrowedResources);
		if (borrowed.length > 0) {
			this.log('info', `Waiting for ${borrowed.length} borrowed resources to be returned`);

			// Set a reasonable timeout for draining
			const drainTimeout = 30000; // 30 seconds
			const start = Date.now();

			while (this.borrowedResources.size > 0 && Date.now() - start < drainTimeout) {
				await new Promise((resolve) => setTimeout(resolve, 100));
			}

			// Force destroy any remaining borrowed resources
			for (const resource of this.borrowedResources) {
				await this.destroyResource(resource);
			}
		}

		this.updateStats();
	}

	/**
	 * Get pool statistics
	 */
	getStats(): PoolStats {
		this.updateStats();
		return { ...this.stats };
	}

	/**
	 * Get pool configuration
	 */
	getConfig(): PoolConfig {
		return { ...this.config };
	}

	/**
	 * Update pool configuration
	 */
	updateConfig(updates: Partial<PoolConfig>): void {
		this.config = { ...this.config, ...updates };

		// Restart reaper if interval changed
		if (updates.reapIntervalMs && this.reapInterval) {
			clearInterval(this.reapInterval);
			this.startReaper();
		}

		// Adjust pool size if min/max changed
		if (updates.min !== undefined || updates.max !== undefined) {
			this.ensureMinimum();
			this.ensureMaximum();
		}
	}

	/**
	 * Try to acquire a resource immediately
	 */
	private async tryAcquire(
		resolve: (resource: T) => void,
		reject: (error: Error) => void,
	): Promise<void> {
		try {
			// Try to get from idle resources first
			if (this.idleResources.length > 0) {
				const resource = this.idleResources.pop();
				if (!resource) {
					return this.tryAcquire(resolve, reject);
				}

				// Test resource health if configured
				if (this.config.testOnBorrow) {
					const isValid = await this.factory.validate(resource);
					if (!isValid) {
						await this.destroyResource(resource);
						return this.tryAcquire(resolve, reject);
					}
				}

				this.borrowedResources.add(resource);
				this.stats.borrowed++;
				resource.usageCount++;
				this.updateStats();
				resolve(resource);
				return;
			}

			// Try to create new resource if under limit
			if (this.resources.size < this.config.max) {
				try {
					const resource = await this.createResource();
					this.borrowedResources.add(resource);
					this.stats.borrowed++;
					resource.usageCount++;
					this.updateStats();
					resolve(resource);
					return;
				} catch (error) {
					this.stats.failed++;
					reject(error as Error);
					return;
				}
			}

			// No resources available, add to waiting queue
			this.waitingQueue.push({
				resolve,
				reject,
				timestamp: Date.now(),
			});
		} catch (error) {
			this.stats.failed++;
			reject(error as Error);
		}
	}

	/**
	 * Create a new resource
	 */
	private async createResource(): Promise<T> {
		const createPromise = Promise.race([
			this.factory.create(),
			new Promise<never>((_, reject) => {
				setTimeout(() => reject(new Error('Create timeout')), this.config.createTimeoutMs);
			}),
		]);

		this.pendingCreates.push(createPromise);

		try {
			const resource = await createPromise;
			resource.createdAt = Date.now();
			resource.lastUsed = Date.now();
			resource.usageCount = 0;
			resource.isHealthy = true;

			this.resources.add(resource);
			this.stats.created++;

			return resource;
		} finally {
			const index = this.pendingCreates.indexOf(createPromise);
			if (index > -1) {
				this.pendingCreates.splice(index, 1);
			}
		}
	}

	/**
	 * Destroy a resource
	 */
	private async destroyResource(resource: T): Promise<void> {
		try {
			this.resources.delete(resource);
			this.stats.destroyed++;

			await Promise.race([
				this.factory.destroy(resource),
				new Promise<void>((_, reject) => {
					setTimeout(() => reject(new Error('Destroy timeout')), this.config.destroyTimeoutMs);
				}),
			]);
		} catch (error) {
			this.log('error', 'Error destroying resource:', error);
		}
	}

	/**
	 * Process waiting queue
	 */
	private processWaitingQueue(): void {
		while (this.waitingQueue.length > 0 && this.idleResources.length > 0) {
			const entry = this.waitingQueue.shift();
			if (!entry) break;
			const { resolve } = entry;
			this.tryAcquire(resolve, () => {
				// Error handling is done in tryAcquire
			});
		}
	}

	/**
	 * Remove request from waiting queue
	 */
	private removeFromWaitingQueue(resolve: (resource: T) => void): void {
		const index = this.waitingQueue.findIndex((req) => req.resolve === resolve);
		if (index > -1) {
			this.waitingQueue.splice(index, 1);
		}
	}

	/**
	 * Ensure minimum number of resources
	 */
	private async ensureMinimum(): Promise<void> {
		const needed = this.config.min - this.resources.size;
		for (let i = 0; i < needed; i++) {
			try {
				const resource = await this.createResource();
				this.idleResources.push(resource);
			} catch (error) {
				this.log('error', 'Failed to create minimum resource:', error);
				break;
			}
		}
		this.updateStats();
	}

	/**
	 * Ensure maximum number of resources
	 */
	private ensureMaximum(): void {
		while (this.idleResources.length > 0 && this.resources.size > this.config.max) {
			const resource = this.idleResources.pop();
			if (resource) this.destroyResource(resource);
		}
		this.updateStats();
	}

	// Normalize and emit errors consistently with brAInwav branding
	private emitError(err: unknown): void {
		const e = err instanceof Error ? err : new Error(String(err));
		// Include brAInwav branding in emitted error messages
		this.log('error', `brAInwav: ${e.message}`);
	}

	/**
	 * Start resource reaper
	 */
	private startReaper(): void {
		this.reapInterval = setInterval(() => {
			this.reapIdleResources();
		}, this.config.reapIntervalMs);
	}

	/**
	 * Reap idle resources that have exceeded idle timeout
	 */
	private async reapIdleResources(): Promise<void> {
		const now = Date.now();
		const resourcesToReap: T[] = [];

		// Find resources that have been idle too long
		for (let i = this.idleResources.length - 1; i >= 0; i--) {
			const resource = this.idleResources[i];
			const idleTime = now - resource.lastUsed;

			if (idleTime > this.config.idleTimeoutMs && this.resources.size > this.config.min) {
				resourcesToReap.push(resource);
				this.idleResources.splice(i, 1);
			}
		}

		// Test idle resources if configured
		if (this.config.testOnIdle) {
			for (let i = this.idleResources.length - 1; i >= 0; i--) {
				const resource = this.idleResources[i];
				try {
					const isValid = await this.factory.validate(resource);
					if (!isValid) {
						resourcesToReap.push(resource);
						this.idleResources.splice(i, 1);
					}
				} catch (error) {
					this.log('error', 'Error testing idle resource:', error);
					resourcesToReap.push(resource);
					this.idleResources.splice(i, 1);
				}
			}
		}

		// Destroy reaped resources
		for (const resource of resourcesToReap) {
			await this.destroyResource(resource);
		}

		this.updateStats();
		this.ensureMinimum();
	}

	/**
	 * Update statistics
	 */
	private updateStats(): void {
		this.stats.total = this.resources.size;
		this.stats.idle = this.idleResources.length;
		this.stats.busy = this.borrowedResources.size;
		this.stats.pending = this.waitingQueue.length;
	}

	/**
	 * Log message based on log level
	 */
	private log(level: string, message: string, ...args: unknown[]): void {
		const levels = ['none', 'error', 'warn', 'info', 'debug'];
		const configLevel = levels.indexOf(this.config.logLevel);
		const messageLevel = levels.indexOf(level);

		if (messageLevel <= configLevel && messageLevel > 0) {
			switch (level) {
				case 'error':
					console.error(`[ConnectionPool] ${message}`, ...args);
					break;
				case 'warn':
					console.warn(`[ConnectionPool] ${message}`, ...args);
					break;
				case 'info':
					console.info(`[ConnectionPool] ${message}`, ...args);
					break;
				case 'debug':
					console.debug(`[ConnectionPool] ${message}`, ...args);
					break;
			}
		}
	}
}

/**
 * Default pool configuration
 */
export const defaultPoolConfig: PoolConfig = {
	min: 2,
	max: 10,
	acquireTimeoutMs: 10000,
	idleTimeoutMs: 300000, // 5 minutes
	reapIntervalMs: 60000, // 1 minute
	createTimeoutMs: 5000,
	destroyTimeoutMs: 5000,
	logLevel: 'warn',
	testOnBorrow: true,
	testOnReturn: false,
	testOnIdle: true,
};

/**
 * PoolConfig schema for validation
 */
const PoolConfigSchema = z
	.object({
		min: z.number().int().min(0).optional(),
		max: z.number().int().min(1).optional(),
		acquireTimeoutMs: z.number().int().min(0).optional(),
		idleTimeoutMs: z.number().int().min(0).optional(),
		reapIntervalMs: z.number().int().min(100).optional(),
		createTimeoutMs: z.number().int().min(0).optional(),
		destroyTimeoutMs: z.number().int().min(0).optional(),
		logLevel: z.enum(['none', 'error', 'warn', 'info', 'debug']).optional(),
		testOnBorrow: z.boolean().optional(),
		testOnReturn: z.boolean().optional(),
		testOnIdle: z.boolean().optional(),
	})
	.strict();
