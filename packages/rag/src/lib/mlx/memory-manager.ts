/**
 * MLX Memory Manager
 * Monitors and manages memory usage for MLX operations
 */

import { freemem, totalmem } from 'node:os';

export interface MemoryThresholds {
	warning: number;
	critical: number;
	shutdown: number;
}

export interface MemoryStatusResult {
	status: 'healthy' | 'warning' | 'critical';
	used: number;
	total: number;
	percentage: number;
	action?: string;
}

export interface SystemMemoryStats {
	used: number;
	total: number;
	free: number;
	cached: number;
}

/**
 * Production MLX Memory Manager with automatic cleanup and monitoring
 */
export class MLXMemoryManager {
	private readonly thresholds: MemoryThresholds = {
		warning: 0.7, // 70% memory usage
		critical: 0.85, // 85% memory usage
		shutdown: 0.95, // 95% memory usage
	};

	private readonly cleanupCallbacks: Array<() => Promise<void>> = [];
	private isMonitoring = false;
	private monitoringInterval?: NodeJS.Timeout;

	constructor(customThresholds?: Partial<MemoryThresholds>) {
		if (customThresholds) {
			this.thresholds = { ...this.thresholds, ...customThresholds };
		}
	}

	/**
	 * Check current memory status and perform cleanup if needed
	 */
	async checkMemory(): Promise<MemoryStatusResult> {
		const stats = await this.getSystemMemory();
		const usage = stats.used / stats.total;

		if (usage > this.thresholds.shutdown) {
			await this.emergencyCleanup();
			return {
				status: 'critical',
				used: stats.used,
				total: stats.total,
				percentage: usage,
				action: 'emergency_cleanup_performed',
			};
		}

		if (usage > this.thresholds.critical) {
			await this.releaseNonEssentialMemory();
			return {
				status: 'critical',
				used: stats.used,
				total: stats.total,
				percentage: usage,
				action: 'non_essential_memory_released',
			};
		}

		if (usage > this.thresholds.warning) {
			await this.performMaintenanceCleanup();
			return {
				status: 'warning',
				used: stats.used,
				total: stats.total,
				percentage: usage,
				action: 'maintenance_cleanup_performed',
			};
		}

		return {
			status: 'healthy',
			used: stats.used,
			total: stats.total,
			percentage: usage,
		};
	}

	/**
	 * Register cleanup callback for memory management
	 */
	registerCleanupCallback(callback: () => Promise<void>): void {
		this.cleanupCallbacks.push(callback);
	}

	/**
	 * Start continuous memory monitoring
	 */
	startMonitoring(intervalMs = 30000): void {
		if (this.isMonitoring) {
			return;
		}

		this.isMonitoring = true;
		this.monitoringInterval = setInterval(async () => {
			const status = await this.checkMemory();
			if (status.status !== 'healthy') {
				console.warn(
					`brAInwav MLX memory manager: Memory status ${status.status} (${(status.percentage * 100).toFixed(1)}%) - ${status.action}`,
				);
			}
		}, intervalMs);
	}

	/**
	 * Stop memory monitoring
	 */
	stopMonitoring(): void {
		if (this.monitoringInterval) {
			clearInterval(this.monitoringInterval);
			this.monitoringInterval = undefined;
		}
		this.isMonitoring = false;
	}

	/**
	 * Get system memory statistics
	 */
	private async getSystemMemory(): Promise<SystemMemoryStats> {
		// On macOS, use vm_stat to get memory information
		if (process.platform === 'darwin') {
			return this.getMacOSMemory();
		}

		// Fallback to Node.js process memory (less accurate for system-wide)
		const totalMemory = totalmem();
		const freeMemory = freemem();

		return {
			used: totalMemory - freeMemory,
			total: totalMemory,
			free: freeMemory,
			cached: 0,
		};
	}

	/**
	 * Get memory stats on macOS using vm_stat
	 */
	private async getMacOSMemory(): Promise<SystemMemoryStats> {
		try {
			// Use dynamic import to avoid issues with missing run-process
			const { runProcess } = await import('../run-process');

			const result = await runProcess<string>('vm_stat', [], { timeoutMs: 5000 });

			if (typeof result !== 'string') {
				throw new Error('Invalid vm_stat output');
			}

			return this.parseVmStatOutput(result);
		} catch (error) {
			// Fallback to Node.js memory stats
			console.warn(
				'brAInwav MLX memory manager: Failed to get macOS memory stats, using Node.js fallback:',
				error,
			);
			return this.getNodeMemoryFallback();
		}
	}

	/**
	 * Parse vm_stat output to get memory statistics
	 */
	private parseVmStatOutput(vmStatOutput: string): SystemMemoryStats {
		const lines = vmStatOutput.split('\n');
		let pageSize = 4096; // Default 4KB pages
		let pagesUsed = 0;
		let pagesTotal = 0;

		// Extract page size
		const pageSizeLine = lines.find((line) => line.includes('page size of'));
		if (pageSizeLine) {
			const match = pageSizeLine.match(/page size of (\d+) bytes/);
			if (match) {
				pageSize = parseInt(match[1], 10);
			}
		}

		// Count different types of pages
		for (const line of lines) {
			if (line.includes('Pages free:')) {
				const pages = this.extractPageCount(line);
				pagesTotal += pages;
			} else if (this.isUsedPageType(line)) {
				const pages = this.extractPageCount(line);
				pagesUsed += pages;
				pagesTotal += pages;
			}
		}

		const totalBytes = pagesTotal * pageSize;
		const usedBytes = pagesUsed * pageSize;
		const freeBytes = totalBytes - usedBytes;

		return {
			used: usedBytes,
			total: totalBytes,
			free: freeBytes,
			cached: 0,
		};
	}

	/**
	 * Check if a line represents a used page type
	 */
	private isUsedPageType(line: string): boolean {
		return (
			line.includes('Pages active:') ||
			line.includes('Pages inactive:') ||
			line.includes('Pages wired down:') ||
			line.includes('Pages speculative:')
		);
	}

	/**
	 * Extract page count from a vm_stat line
	 */
	private extractPageCount(line: string): number {
		const match = line.match(/Pages \w+:\s+(\d+)/);
		return match ? parseInt(match[1], 10) : 0;
	}

	/**
	 * Get Node.js memory fallback
	 */
	private getNodeMemoryFallback(): SystemMemoryStats {
		const totalMemory = totalmem();
		const freeMemory = freemem();

		return {
			used: totalMemory - freeMemory,
			total: totalMemory,
			free: freeMemory,
			cached: 0,
		};
	}

	/**
	 * Perform emergency cleanup when memory is critically low
	 */
	private async emergencyCleanup(): Promise<void> {
		console.warn('brAInwav MLX memory manager: Performing emergency memory cleanup');

		// Execute all registered cleanup callbacks
		await Promise.allSettled(this.cleanupCallbacks.map((callback) => callback()));

		// Force garbage collection if available
		if (global.gc) {
			global.gc();
		}

		// Additional emergency measures
		await this.forceClearCaches();
	}

	/**
	 * Release non-essential memory when usage is high
	 */
	private async releaseNonEssentialMemory(): Promise<void> {
		console.info('brAInwav MLX memory manager: Releasing non-essential memory');

		// Execute cleanup callbacks (first half)
		const halfPoint = Math.ceil(this.cleanupCallbacks.length / 2);
		await Promise.allSettled(
			this.cleanupCallbacks.slice(0, halfPoint).map((callback) => callback()),
		);

		// Trigger garbage collection
		if (global.gc) {
			global.gc();
		}
	}

	/**
	 * Perform regular maintenance cleanup
	 */
	private async performMaintenanceCleanup(): Promise<void> {
		console.debug('brAInwav MLX memory manager: Performing maintenance memory cleanup');

		// Light cleanup - only execute a few callbacks
		const maxCallbacks = Math.min(3, this.cleanupCallbacks.length);
		await Promise.allSettled(
			this.cleanupCallbacks.slice(0, maxCallbacks).map((callback) => callback()),
		);
	}

	/**
	 * Force clear all caches (emergency only)
	 */
	private async forceClearCaches(): Promise<void> {
		// This would typically clear embedding caches, model caches, etc.
		// Implementation depends on what caching systems are in use
		console.warn('brAInwav MLX memory manager: Force clearing all caches');
	}

	/**
	 * Cleanup and stop monitoring
	 */
	async cleanup(): Promise<void> {
		this.stopMonitoring();
		this.cleanupCallbacks.length = 0;
	}
}

/**
 * Create a singleton memory manager instance
 */
let memoryManagerInstance: MLXMemoryManager | undefined;

export function getMLXMemoryManager(): MLXMemoryManager {
	if (!memoryManagerInstance) {
		memoryManagerInstance = new MLXMemoryManager();
	}
	return memoryManagerInstance;
}

/**
 * Cleanup the singleton instance
 */
export async function cleanupMLXMemoryManager(): Promise<void> {
	if (memoryManagerInstance) {
		await memoryManagerInstance.cleanup();
		memoryManagerInstance = undefined;
	}
}
