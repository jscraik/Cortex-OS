/**
 * Resource Management Utilities for Cortex-OS Agents
 *
 * Provides resource lifecycle management, memory cleanup, and resource monitoring
 * following brAInwav engineering standards.
 *
 * Co-authored-by: brAInwav Development Team
 */

import { EventEmitter } from 'node:events';

// Resource types in the agent system
export type ResourceType =
	| 'stream'
	| 'timeout'
	| 'interval'
	| 'event-listener'
	| 'file-handle'
	| 'network-connection'
	| 'memory-buffer'
	| 'langgraph-execution'
	| 'sub-agent-instance';

// Resource state
export type ResourceState = 'active' | 'cleaning' | 'cleaned' | 'error';

// Managed resource interface
export interface ManagedResource {
	id: string;
	type: ResourceType;
	state: ResourceState;
	createdAt: string;
	lastAccessedAt: string;
	metadata: Record<string, unknown>;
	cleanup: () => Promise<void> | void;
	healthCheck?: () => Promise<boolean> | boolean;
}

// Resource limits configuration
export interface ResourceLimits {
	maxTotalResources: number;
	maxResourcesByType: Partial<Record<ResourceType, number>>;
	maxMemoryMB: number;
	maxExecutionTimeMs: number;
	cleanupIntervalMs: number;
}

// Resource metrics
export interface ResourceMetrics {
	totalResources: number;
	resourcesByType: Record<ResourceType, number>;
	resourcesByState: Record<ResourceState, number>;
	memoryUsageMB: number;
	oldestResourceAge: number;
	cleanupCount: number;
	errorCount: number;
}

/**
 * Advanced Resource Manager for Agent System
 */
export class AgentResourceManager extends EventEmitter {
	private resources = new Map<string, ManagedResource>();
	private limits: ResourceLimits;
	private cleanupInterval?: NodeJS.Timeout;
	private metrics: ResourceMetrics;
	private isShuttingDown = false;

	constructor(limits?: Partial<ResourceLimits>) {
		super();

		this.limits = {
			maxTotalResources: 1000,
			maxResourcesByType: {
				stream: 50,
				timeout: 100,
				interval: 20,
				'event-listener': 200,
				'file-handle': 50,
				'network-connection': 25,
				'memory-buffer': 10,
				'langgraph-execution': 5,
				'sub-agent-instance': 10,
			},
			maxMemoryMB: 512,
			maxExecutionTimeMs: 300000, // 5 minutes
			cleanupIntervalMs: 30000, // 30 seconds
			...limits,
		};

		this.metrics = {
			totalResources: 0,
			resourcesByType: {} as Record<ResourceType, number>,
			resourcesByState: {} as Record<ResourceState, number>,
			memoryUsageMB: 0,
			oldestResourceAge: 0,
			cleanupCount: 0,
			errorCount: 0,
		};

		this.startCleanupInterval();
		this.setupProcessHandlers();
	}

	/**
	 * Register a new resource
	 */
	async register(
		id: string,
		type: ResourceType,
		cleanup: () => Promise<void> | void,
		options?: {
			metadata?: Record<string, unknown>;
			healthCheck?: () => Promise<boolean> | boolean;
		},
	): Promise<void> {
		if (this.isShuttingDown) {
			throw new Error('Cannot register resources during shutdown');
		}

		// Check limits
		await this.checkLimits(type);

		const resource: ManagedResource = {
			id,
			type,
			state: 'active',
			createdAt: new Date().toISOString(),
			lastAccessedAt: new Date().toISOString(),
			metadata: options?.metadata || {},
			cleanup,
			healthCheck: options?.healthCheck,
		};

		this.resources.set(id, resource);
		this.updateMetrics();

		this.emit('resource-registered', { id, type });
	}

	/**
	 * Unregister and cleanup a resource
	 */
	async unregister(id: string): Promise<boolean> {
		const resource = this.resources.get(id);
		if (!resource) {
			return false;
		}

		try {
			resource.state = 'cleaning';
			await resource.cleanup();
			resource.state = 'cleaned';
			this.resources.delete(id);

			this.updateMetrics();
			this.emit('resource-unregistered', { id, type: resource.type });

			return true;
		} catch (error) {
			resource.state = 'error';
			this.metrics.errorCount++;
			this.emit('resource-cleanup-error', { id, error });
			return false;
		}
	}

	/**
	 * Access a resource (updates last accessed time)
	 */
	access(id: string): ManagedResource | undefined {
		const resource = this.resources.get(id);
		if (resource) {
			resource.lastAccessedAt = new Date().toISOString();
		}
		return resource;
	}

	/**
	 * Get all resources of a specific type
	 */
	getResourcesByType(type: ResourceType): ManagedResource[] {
		return Array.from(this.resources.values()).filter((r) => r.type === type);
	}

	/**
	 * Get resources by state
	 */
	getResourcesByState(state: ResourceState): ManagedResource[] {
		return Array.from(this.resources.values()).filter((r) => r.state === state);
	}

	/**
	 * Cleanup stale resources
	 */
	async cleanupStaleResources(): Promise<number> {
		const now = Date.now();
		const staleThreshold = this.limits.maxExecutionTimeMs;
		let cleanedCount = 0;

		for (const [id, resource] of this.resources) {
			const age = now - new Date(resource.createdAt).getTime();

			if (age > staleThreshold) {
				const success = await this.unregister(id);
				if (success) {
					cleanedCount++;
				}
			}
		}

		if (cleanedCount > 0) {
			this.emit('stale-resources-cleaned', { count: cleanedCount });
		}

		return cleanedCount;
	}

	/**
	 * Perform health checks on all resources
	 */
	async performHealthChecks(): Promise<{
		healthy: number;
		unhealthy: number;
		errors: Array<{ id: string; error: unknown }>;
	}> {
		let healthy = 0;
		let unhealthy = 0;
		const errors: Array<{ id: string; error: unknown }> = [];

		for (const [id, resource] of this.resources) {
			if (!resource.healthCheck) {
				continue; // Skip resources without health checks
			}

			try {
				const isHealthy = await resource.healthCheck();
				if (isHealthy) {
					healthy++;
				} else {
					unhealthy++;
					this.emit('resource-unhealthy', { id, type: resource.type });
				}
			} catch (error) {
				unhealthy++;
				errors.push({ id, error });
				this.emit('resource-health-error', { id, error });
			}
		}

		return { healthy, unhealthy, errors };
	}

	/**
	 * Force cleanup of all resources
	 */
	async cleanup(): Promise<void> {
		this.isShuttingDown = true;

		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
		}

		const cleanupPromises = Array.from(this.resources.keys()).map((id) => this.unregister(id));

		await Promise.allSettled(cleanupPromises);

		this.emit('cleanup-complete', {
			resourcesProcessed: cleanupPromises.length,
			errors: this.metrics.errorCount,
		});
	}

	/**
	 * Get current metrics
	 */
	getMetrics(): ResourceMetrics {
		this.updateMetrics();
		return { ...this.metrics };
	}

	/**
	 * Get resource limits
	 */
	getLimits(): ResourceLimits {
		return { ...this.limits };
	}

	/**
	 * Update resource limits
	 */
	updateLimits(newLimits: Partial<ResourceLimits>): void {
		this.limits = { ...this.limits, ...newLimits };
		this.emit('limits-updated', this.limits);
	}

	/**
	 * Check if resource creation would exceed limits
	 */
	private async checkLimits(type: ResourceType): Promise<void> {
		// Check total resource limit
		if (this.resources.size >= this.limits.maxTotalResources) {
			await this.cleanupStaleResources();

			if (this.resources.size >= this.limits.maxTotalResources) {
				throw new Error(`Maximum total resources exceeded: ${this.limits.maxTotalResources}`);
			}
		}

		// Check type-specific limit
		const typeLimit = this.limits.maxResourcesByType[type];
		if (typeLimit) {
			const currentCount = this.getResourcesByType(type).length;
			if (currentCount >= typeLimit) {
				throw new Error(`Maximum ${type} resources exceeded: ${typeLimit}`);
			}
		}

		// Check memory limit (approximation)
		const memoryUsage = this.estimateMemoryUsage();
		if (memoryUsage > this.limits.maxMemoryMB) {
			await this.cleanupStaleResources();
		}
	}

	/**
	 * Estimate current memory usage
	 */
	private estimateMemoryUsage(): number {
		// Rough estimation based on resource types
		let totalMB = 0;

		for (const resource of this.resources.values()) {
			switch (resource.type) {
				case 'memory-buffer':
					totalMB += 10; // Assume 10MB per buffer
					break;
				case 'langgraph-execution':
					totalMB += 50; // Assume 50MB per execution
					break;
				case 'sub-agent-instance':
					totalMB += 25; // Assume 25MB per sub-agent
					break;
				case 'stream':
					totalMB += 1; // Assume 1MB per stream
					break;
				default:
					totalMB += 0.1; // Minimal for other types
			}
		}

		return totalMB;
	}

	/**
	 * Update internal metrics
	 */
	private updateMetrics(): void {
		const now = Date.now();
		let oldestAge = 0;

		// Reset counters
		const resourcesByType: Record<string, number> = {};
		const resourcesByState: Record<string, number> = {};

		for (const resource of this.resources.values()) {
			// Count by type
			resourcesByType[resource.type] = (resourcesByType[resource.type] || 0) + 1;

			// Count by state
			resourcesByState[resource.state] = (resourcesByState[resource.state] || 0) + 1;

			// Calculate oldest resource age
			const age = now - new Date(resource.createdAt).getTime();
			oldestAge = Math.max(oldestAge, age);
		}

		this.metrics = {
			totalResources: this.resources.size,
			resourcesByType: resourcesByType as Record<ResourceType, number>,
			resourcesByState: resourcesByState as Record<ResourceState, number>,
			memoryUsageMB: this.estimateMemoryUsage(),
			oldestResourceAge: oldestAge,
			cleanupCount: this.metrics.cleanupCount,
			errorCount: this.metrics.errorCount,
		};
	}

	/**
	 * Start automatic cleanup interval
	 */
	private startCleanupInterval(): void {
		this.cleanupInterval = setInterval(async () => {
			try {
				const cleaned = await this.cleanupStaleResources();
				this.metrics.cleanupCount += cleaned;

				// Perform health checks periodically
				await this.performHealthChecks();
			} catch (error) {
				this.emit('cleanup-interval-error', error);
			}
		}, this.limits.cleanupIntervalMs);
	}

	/**
	 * Setup process handlers for graceful shutdown
	 */
	private setupProcessHandlers(): void {
		const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];

		signals.forEach((signal) => {
			process.on(signal, async () => {
				console.log(`Received ${signal}, cleaning up resources...`);
				await this.cleanup();
				process.exit(0);
			});
		});

		process.on('uncaughtException', async (error) => {
			console.error('Uncaught exception, cleaning up resources:', error);
			await this.cleanup();
			process.exit(1);
		});

		process.on('unhandledRejection', async (reason) => {
			console.error('Unhandled rejection, cleaning up resources:', reason);
			await this.cleanup();
			process.exit(1);
		});
	}
}

/**
 * Utility functions for resource management
 */
export const resourceUtils = {
	/**
	 * Create a managed timeout
	 */
	createManagedTimeout(
		manager: AgentResourceManager,
		callback: () => void,
		ms: number,
		id?: string,
	): string {
		const timeoutId = id || `timeout-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

		const timeout = setTimeout(callback, ms);

		manager.register(timeoutId, 'timeout', () => clearTimeout(timeout), {
			metadata: { ms, createdAt: Date.now() },
		});

		return timeoutId;
	},

	/**
	 * Create a managed interval
	 */
	createManagedInterval(
		manager: AgentResourceManager,
		callback: () => void,
		ms: number,
		id?: string,
	): string {
		const intervalId = id || `interval-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

		const interval = setInterval(callback, ms);

		manager.register(intervalId, 'interval', () => clearInterval(interval), {
			metadata: { ms, createdAt: Date.now() },
		});

		return intervalId;
	},

	/**
	 * Create a managed event listener
	 */
	createManagedEventListener(
		manager: AgentResourceManager,
		target: EventTarget | NodeJS.EventEmitter,
		event: string,
		callback: (...args: unknown[]) => void,
		id?: string,
	): string {
		const listenerId = id || `listener-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

		if ('addEventListener' in target) {
			target.addEventListener(event, callback as EventListener);
		} else if ('on' in target) {
			(target as NodeJS.EventEmitter).on(event, callback);
		}

		manager.register(
			listenerId,
			'event-listener',
			() => {
				if ('removeEventListener' in target) {
					target.removeEventListener(event, callback as EventListener);
				} else if ('off' in target) {
					(target as NodeJS.EventEmitter).off(event, callback);
				}
			},
			{
				metadata: { event, targetType: target.constructor.name },
			},
		);

		return listenerId;
	},
};

/**
 * Factory function to create agent resource manager
 */
export function createAgentResourceManager(limits?: Partial<ResourceLimits>): AgentResourceManager {
	return new AgentResourceManager(limits);
}
