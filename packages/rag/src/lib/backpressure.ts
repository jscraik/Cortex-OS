/**
 * Timeout configuration and backpressure handling for RAG pipeline components.
 *
 * This module provides configurable timeouts and backpressure management
 * to prevent resource exhaustion and ensure graceful degradation under load.
 */

export interface ComponentTimeoutConfig {
	/** Embedder operation timeout in milliseconds */
	embedder: number;
	/** Store operation timeout in milliseconds */
	store: number;
	/** Reranker operation timeout in milliseconds */
	reranker: number;
	/** Health check timeout in milliseconds */
	healthCheck: number;
	/** HTTP request timeout in milliseconds */
	httpRequest: number;
}

export interface BackpressureConfig {
	/** Maximum concurrent operations per component */
	maxConcurrent: {
		embedder: number;
		store: number;
		reranker: number;
	};
	/** Queue size limits before rejecting requests */
	maxQueueSize: {
		embedder: number;
		store: number;
		reranker: number;
	};
	/** Whether to enable adaptive backpressure based on system resources */
	adaptive: boolean;
	/** Resource thresholds for adaptive backpressure */
	resourceThresholds: {
		/** Memory usage percentage to start throttling */
		memoryPercent: number;
		/** CPU usage percentage to start throttling */
		cpuPercent: number;
	};
}

/** Default production timeout configuration */
export const DEFAULT_TIMEOUT_CONFIG: ComponentTimeoutConfig = {
	embedder: 30000, // 30 seconds for model inference
	store: 5000, // 5 seconds for database operations
	reranker: 15000, // 15 seconds for reranking
	healthCheck: 2000, // 2 seconds for health checks
	httpRequest: 10000, // 10 seconds for HTTP requests
};

/** Default production backpressure configuration */
export const DEFAULT_BACKPRESSURE_CONFIG: BackpressureConfig = {
	maxConcurrent: {
		embedder: 4, // Limit concurrent embedding operations
		store: 10, // Limit concurrent store operations
		reranker: 2, // Limit concurrent reranking operations
	},
	maxQueueSize: {
		embedder: 20, // Queue up to 20 embedding requests
		store: 50, // Queue up to 50 store requests
		reranker: 10, // Queue up to 10 rerank requests
	},
	adaptive: true,
	resourceThresholds: {
		memoryPercent: 80, // Start throttling at 80% memory usage
		cpuPercent: 75, // Start throttling at 75% CPU usage
	},
};

/** Development/testing configuration with more lenient limits */
export const DEV_TIMEOUT_CONFIG: ComponentTimeoutConfig = {
	embedder: 60000, // 1 minute for development
	store: 10000, // 10 seconds
	reranker: 30000, // 30 seconds
	healthCheck: 5000, // 5 seconds
	httpRequest: 20000, // 20 seconds
};

export const DEV_BACKPRESSURE_CONFIG: BackpressureConfig = {
	maxConcurrent: {
		embedder: 2,
		store: 5,
		reranker: 1,
	},
	maxQueueSize: {
		embedder: 10,
		store: 25,
		reranker: 5,
	},
	adaptive: false, // Disable adaptive throttling in development
	resourceThresholds: {
		memoryPercent: 90,
		cpuPercent: 85,
	},
};

/**
 * Simple semaphore for controlling concurrent operations.
 */
export class Semaphore {
	private permits: number;
	private readonly queue: Array<() => void> = [];

	constructor(maxPermits: number) {
		this.permits = maxPermits;
	}

	async acquire(): Promise<void> {
		return new Promise<void>((resolve) => {
			if (this.permits > 0) {
				this.permits--;
				resolve();
			} else {
				this.queue.push(resolve);
			}
		});
	}

	release(): void {
		if (this.queue.length > 0) {
			const resolve = this.queue.shift();
			if (resolve) {
				resolve();
			}
		} else {
			this.permits++;
		}
	}

	get available(): number {
		return this.permits;
	}

	get queued(): number {
		return this.queue.length;
	}
}

/**
 * Backpressure manager that tracks concurrent operations and applies limits.
 */
export class BackpressureManager {
	private readonly semaphores: Record<keyof BackpressureConfig['maxConcurrent'], Semaphore>;
	private systemResourceUsage: { memoryPercent: number; cpuPercent: number } = {
		memoryPercent: 0,
		cpuPercent: 0,
	};

	constructor(private readonly config: BackpressureConfig) {
		this.semaphores = {
			embedder: new Semaphore(config.maxConcurrent.embedder),
			store: new Semaphore(config.maxConcurrent.store),
			reranker: new Semaphore(config.maxConcurrent.reranker),
		};
	}

	/**
	 * Execute an operation with backpressure control.
	 */
	async withBackpressure<T>(
		component: keyof BackpressureConfig['maxConcurrent'],
		operation: () => Promise<T>,
	): Promise<T> {
		const semaphore = this.semaphores[component];

		// Check queue limits
		if (semaphore.queued >= this.config.maxQueueSize[component]) {
			throw new Error(
				`${component} queue full (${semaphore.queued}/${this.config.maxQueueSize[component]})`,
			);
		}

		// Check adaptive backpressure
		if (this.config.adaptive && this.shouldThrottle()) {
			throw new Error(`${component} throttled due to high resource usage`);
		}

		await semaphore.acquire();
		try {
			return await operation();
		} finally {
			semaphore.release();
		}
	}

	/**
	 * Update system resource usage for adaptive backpressure.
	 */
	updateResourceUsage(memoryPercent: number, cpuPercent: number): void {
		this.systemResourceUsage = { memoryPercent, cpuPercent };
	}

	/**
	 * Check if operations should be throttled based on resource usage.
	 */
	private shouldThrottle(): boolean {
		if (!this.config.adaptive) return false;

		return (
			this.systemResourceUsage.memoryPercent >= this.config.resourceThresholds.memoryPercent ||
			this.systemResourceUsage.cpuPercent >= this.config.resourceThresholds.cpuPercent
		);
	}

	/**
	 * Get current backpressure status.
	 */
	getStatus(): {
		component: keyof BackpressureConfig['maxConcurrent'];
		available: number;
		queued: number;
		maxConcurrent: number;
		maxQueue: number;
	}[] {
		return (Object.keys(this.semaphores) as Array<keyof BackpressureConfig['maxConcurrent']>).map(
			(component) => ({
				component,
				available: this.semaphores[component].available,
				queued: this.semaphores[component].queued,
				maxConcurrent: this.config.maxConcurrent[component],
				maxQueue: this.config.maxQueueSize[component],
			}),
		);
	}
}

/**
 * Timeout wrapper that aborts operations after a specified duration.
 */
export function withTimeout<T>(
	operation: () => Promise<T>,
	timeoutMs: number,
	timeoutMessage = 'Operation timed out',
): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		const timer = setTimeout(() => {
			reject(new Error(`${timeoutMessage} (${timeoutMs}ms)`));
		}, timeoutMs);

		operation()
			.then((result) => {
				clearTimeout(timer);
				resolve(result);
			})
			.catch((error: unknown) => {
				clearTimeout(timer);
				reject(error instanceof Error ? error : new Error(String(error)));
			});
	});
}

/**
 * Enhanced timeout wrapper with AbortController support.
 */
export function withAbortableTimeout<T>(
	operation: (signal: AbortSignal) => Promise<T>,
	timeoutMs: number,
	timeoutMessage = 'Operation timed out',
): Promise<T> {
	const controller = new AbortController();

	return new Promise<T>((resolve, reject) => {
		const timer = setTimeout(() => {
			controller.abort();
			reject(new Error(`${timeoutMessage} (${timeoutMs}ms)`));
		}, timeoutMs);

		operation(controller.signal)
			.then((result) => {
				clearTimeout(timer);
				resolve(result);
			})
			.catch((error: unknown) => {
				clearTimeout(timer);
				reject(error instanceof Error ? error : new Error(String(error)));
			});
	});
}

/**
 * System resource monitor for adaptive backpressure.
 */
export class ResourceMonitor {
	private memoryPercent = 0;
	private cpuPercent = 0;
	private intervalId?: NodeJS.Timeout;

	constructor(private readonly updateInterval = 1000) {}

	start(): void {
		if (this.intervalId) return;

		this.intervalId = setInterval(() => {
			this.updateMetrics();
		}, this.updateInterval);
	}

	stop(): void {
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = undefined;
		}
	}

	getUsage(): { memoryPercent: number; cpuPercent: number } {
		return { memoryPercent: this.memoryPercent, cpuPercent: this.cpuPercent };
	}

	private updateMetrics(): void {
		if (typeof process !== 'undefined' && process.memoryUsage) {
			const mem = process.memoryUsage();
			// Rough estimate: assume 1GB total memory for percentage calculation
			// In production, this should use proper system metrics
			this.memoryPercent = (mem.rss / (1024 * 1024 * 1024)) * 100;
		}

		// CPU percentage would need external library or system calls
		// For now, use a placeholder that could be replaced with proper CPU monitoring
		this.cpuPercent = 0; // Placeholder - implement with proper CPU monitoring
	}
}
