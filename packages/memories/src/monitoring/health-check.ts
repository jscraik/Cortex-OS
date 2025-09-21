import { type MemoryStore } from '../ports/MemoryStore.js';
import { type ExternalStorageManager, getExternalStorageManager } from '../adapters/external-storage.js';

export interface HealthCheckResult {
	status: 'healthy' | 'degraded' | 'unhealthy';
	timestamp: Date;
	components: {
		store: ComponentHealth;
		externalStorage?: ComponentHealth;
		encryption?: ComponentHealth;
		performance?: ComponentHealth;
	};
	metrics: {
		uptimeMs: number;
		memoryUsage: NodeJS.MemoryUsage;
		storeLatencyMs?: number;
	};
	details?: Record<string, any>;
}

export interface ComponentHealth {
	status: 'healthy' | 'degraded' | 'unhealthy';
	latencyMs?: number;
	message?: string;
	details?: Record<string, any>;
}

export interface HealthCheckConfig {
	includeStoreCheck: boolean;
	includeExternalStorageCheck: boolean;
	includePerformanceCheck: boolean;
	storeTestTimeoutMs: number;
	performanceThresholds: {
		maxStoreLatencyMs: number;
		maxMemoryUsageMB: number;
	};
}

export class MemoryHealthChecker {
	private config: HealthCheckConfig;
	private store: MemoryStore;
	private externalStorageManager?: ExternalStorageManager;
	private startTime: Date;

	constructor(store: MemoryStore, config: Partial<HealthCheckConfig> = {}) {
		this.store = store;
		this.startTime = new Date();
		this.config = {
			includeStoreCheck: true,
			includeExternalStorageCheck: true,
			includePerformanceCheck: true,
			storeTestTimeoutMs: 5000,
			performanceThresholds: {
				maxStoreLatencyMs: 100,
				maxMemoryUsageMB: 512,
			},
			...config,
		};

		// Initialize external storage manager if needed
		if (this.config.includeExternalStorageCheck) {
			this.externalStorageManager = getExternalStorageManager();
		}
	}

	/**
	 * Perform comprehensive health check
	 */
	async checkHealth(): Promise<HealthCheckResult> {
		const components: HealthCheckResult['components'] = {
			store: { status: 'healthy' },
		};

		const metrics: HealthCheckResult['metrics'] = {
			uptimeMs: Date.now() - this.startTime.getTime(),
			memoryUsage: process.memoryUsage(),
		};

		const details: Record<string, any> = {};

		// Check store health
		if (this.config.includeStoreCheck) {
			components.store = await this.checkStoreHealth();
			metrics.storeLatencyMs = components.store.latencyMs;
		}

		// Check external storage health
		if (this.config.includeExternalStorageCheck && this.externalStorageManager) {
			components.externalStorage = await this.checkExternalStorageHealth();
		}

		// Check performance metrics
		if (this.config.includePerformanceCheck) {
			components.performance = await this.checkPerformanceHealth(metrics);
		}

		// Determine overall status
		const componentStatuses = Object.values(components).map(c => c.status);
		let overallStatus: HealthCheckResult['status'] = 'healthy';

		if (componentStatuses.includes('unhealthy')) {
			overallStatus = 'unhealthy';
		} else if (componentStatuses.includes('degraded')) {
			overallStatus = 'degraded';
		}

		return {
			status: overallStatus,
			timestamp: new Date(),
			components,
			metrics,
			details,
		};
	}

	/**
	 * Check memory store health
	 */
	private async checkStoreHealth(): Promise<ComponentHealth> {
		const startTime = Date.now();

		try {
			// Test basic store operations
			const testMemory = {
				id: `health-check-${Date.now()}`,
				kind: 'health-check' as const,
				text: 'Health check test memory',
				tags: ['health-check'],
				metadata: { checkType: 'health' },
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				provenance: { source: 'health-checker' },
			};

			// Test write
			await Promise.race([
				this.store.upsert(testMemory),
				new Promise((_, reject) =>
					setTimeout(() => reject(new Error('Store write timeout')), this.config.storeTestTimeoutMs)
				),
			]);

			// Test read
			const retrieved = await Promise.race([
				this.store.get(testMemory.id),
				new Promise((_, reject) =>
					setTimeout(() => reject(new Error('Store read timeout')), this.config.storeTestTimeoutMs)
				),
			]);

			// Test delete
			await Promise.race([
				this.store.delete(testMemory.id),
				new Promise((_, reject) =>
					setTimeout(() => reject(new Error('Store delete timeout')), this.config.storeTestTimeoutMs)
				),
			]);

			const latencyMs = Date.now() - startTime;

			if (!retrieved) {
				return {
					status: 'degraded',
					latencyMs,
					message: 'Store read returned null after write',
				};
			}

			if (latencyMs > this.config.performanceThresholds.maxStoreLatencyMs) {
				return {
					status: 'degraded',
					latencyMs,
					message: `Store latency ${latencyMs}ms exceeds threshold`,
				};
			}

			return {
				status: 'healthy',
				latencyMs,
			};
		} catch (error) {
			return {
				status: 'unhealthy',
				latencyMs: Date.now() - startTime,
				message: error instanceof Error ? error.message : 'Unknown store error',
				details: { error: error instanceof Error ? error.stack : undefined },
			};
		}
	}

	/**
	 * Check external storage health
	 */
	private async checkExternalStorageHealth(): Promise<ComponentHealth> {
		if (!this.externalStorageManager) {
			return {
				status: 'healthy',
				message: 'External storage not configured',
			};
		}

		try {
			const isAvailable = this.externalStorageManager.isAvailable();
			const currentStorage = this.externalStorageManager.getCurrentStorage();
			const allStatus = this.externalStorageManager.getAllStatus();

			if (!isAvailable || !currentStorage) {
				return {
					status: 'degraded',
					message: 'External storage not available',
					details: { allStatus },
				};
			}

			// Check if current storage has sufficient space
			const currentStatus = this.externalStorageManager.getStatus(currentStorage);
			if (currentStatus?.freeSpaceGB && currentStatus.freeSpaceGB < 1) {
				return {
					status: 'degraded',
					message: `Low disk space: ${currentStatus.freeSpaceGB.toFixed(2)}GB remaining`,
					details: { currentStatus },
				};
			}

			return {
				status: 'healthy',
				details: {
					currentStorage,
					freeSpaceGB: currentStatus?.freeSpaceGB,
					allStatusCount: allStatus.length,
				},
			};
		} catch (error) {
			return {
				status: 'unhealthy',
				message: error instanceof Error ? error.message : 'Unknown external storage error',
				details: { error: error instanceof Error ? error.stack : undefined },
			};
		}
	}

	/**
	 * Check performance health
	 */
	private async checkPerformanceHealth(metrics: HealthCheckResult['metrics']): Promise<ComponentHealth> {
		const memoryUsageMB = metrics.memoryUsage.heapUsed / (1024 * 1024);
		const threshold = this.config.performanceThresholds.maxMemoryUsageMB;

		if (memoryUsageMB > threshold) {
			return {
				status: 'degraded',
				message: `Memory usage ${memoryUsageMB.toFixed(2)}MB exceeds threshold ${threshold}MB`,
				details: {
					memoryUsageMB,
					threshold,
					memoryUsage: metrics.memoryUsage,
				},
			};
		}

		// Check store latency if available
		if (metrics.storeLatencyMs && metrics.storeLatencyMs > this.config.performanceThresholds.maxStoreLatencyMs) {
			return {
				status: 'degraded',
				message: `Store latency ${metrics.storeLatencyMs}ms exceeds threshold`,
				details: { storeLatencyMs: metrics.storeLatencyMs },
			};
		}

		return {
			status: 'healthy',
			details: {
				memoryUsageMB,
				storeLatencyMs: metrics.storeLatencyMs,
			},
		};
	}

	/**
	 * Get quick health status (for load balancers)
	 */
	async quickCheck(): Promise<{ status: 'healthy' | 'unhealthy'; timestamp: Date }> {
		try {
			// Just check if store responds
			await this.store.search({ limit: 1 });
			return {
				status: 'healthy',
				timestamp: new Date(),
			};
		} catch {
			return {
				status: 'unhealthy',
				timestamp: new Date(),
			};
		}
	}
}

/**
 * Create health check middleware for Express
 */
export function createHealthCheckMiddleware(healthChecker: MemoryHealthChecker) {
	return async (req: any, res: any) => {
		const { query } = req;
		const detailed = query.detailed === 'true';

		try {
			if (detailed) {
				const result = await healthChecker.checkHealth();
				res.status(result.status === 'healthy' ? 200 : result.status === 'degraded' ? 200 : 503)
					.json(result);
			} else {
				const result = await healthChecker.quickCheck();
				res.status(result.status === 'healthy' ? 200 : 503)
					.json(result);
			}
		} catch (error) {
			res.status(500).json({
				status: 'unhealthy',
				timestamp: new Date(),
				error: error instanceof Error ? error.message : 'Unknown error',
			});
		}
	};
}

/**
 * Create health check endpoint for MCP
 */
export function createHealthCheckTool(healthChecker: MemoryHealthChecker) {
	return {
		name: 'memories.health_check',
		description: 'Check the health status of the memory system',
		inputSchema: {
			type: 'object',
			properties: {
				detailed: {
					type: 'boolean',
					description: 'Return detailed health information',
					default: false,
				},
			},
		},
		handler: async (params: { detailed?: boolean }) => {
			if (params.detailed) {
				return await healthChecker.checkHealth();
			} else {
				return await healthChecker.quickCheck();
			}
		},
	};
}