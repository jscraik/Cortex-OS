import { performance } from 'perf_hooks';

/**
 * Utility for tracking request duration and metrics
 */
export class RequestTracker {
	private startTime: number;

	constructor() {
		this.startTime = performance.now();
	}

	end(): number {
		return performance.now() - this.startTime;
	}
}

/**
 * Calculate percentile from an array of numbers
 */
export function calculatePercentile(values: number[], percentile: number): number {
	if (values.length === 0) return 0;

	const sorted = values.sort((a, b) => a - b);
	const index = Math.ceil((percentile / 100) * sorted.length) - 1;
	return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

/**
 * Calculate basic statistics from an array of numbers
 */
export function calculateStats(values: number[]) {
	if (values.length === 0) {
		return {
			count: 0,
			sum: 0,
			avg: 0,
			min: 0,
			max: 0,
			p50: 0,
			p95: 0,
			p99: 0,
		};
	}

	const sorted = values.sort((a, b) => a - b);
	const sum = values.reduce((a, b) => a + b, 0);

	return {
		count: values.length,
		sum,
		avg: sum / values.length,
		min: sorted[0],
		max: sorted[sorted.length - 1],
		p50: calculatePercentile(values, 50),
		p95: calculatePercentile(values, 95),
		p99: calculatePercentile(values, 99),
	};
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number, decimals = 2): string {
	if (bytes === 0) return '0 B';

	const k = 1024;
	const dm = decimals < 0 ? 0 : decimals;
	const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Format duration to human-readable string
 */
export function formatDuration(milliseconds: number): string {
	if (milliseconds < 1000) {
		return `${Math.round(milliseconds)}ms`;
	}

	const seconds = milliseconds / 1000;
	if (seconds < 60) {
		return `${seconds.toFixed(2)}s`;
	}

	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;
	return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
}

/**
 * Health status utilities
 */
export const HealthStatus = {
	isHealthy: (status: string): status is 'healthy' => status === 'healthy',
	isDegraded: (status: string): status is 'degraded' => status === 'degraded',
	isUnhealthy: (status: string): status is 'unhealthy' => status === 'unhealthy',

	getWorstStatus: (statuses: string[]): 'healthy' | 'degraded' | 'unhealthy' => {
		if (statuses.includes('unhealthy')) return 'unhealthy';
		if (statuses.includes('degraded')) return 'degraded';
		return 'healthy';
	},
};

/**
 * Create a health check result
 */
export function createHealthCheck(
	name: string,
	status: 'healthy' | 'degraded' | 'unhealthy',
	details?: Record<string, any>,
) {
	return {
		name,
		status,
		timestamp: new Date().toISOString(),
		...(details && { details }),
	};
}

/**
 * Create a component health check with latency
 */
export function createComponentHealth(
	name: string,
	status: 'healthy' | 'degraded' | 'unhealthy',
	latency: number,
	additionalData?: Record<string, any>,
) {
	return {
		name,
		status,
		timestamp: new Date().toISOString(),
		latency,
		...additionalData,
		details: {
			message:
				status === 'healthy'
					? `${name} operational`
					: status === 'degraded'
						? `${name} experiencing issues`
						: `${name} failed`,
			...additionalData?.details,
		},
	};
}

/**
 * Debounce function for health checks
 */
export function debounce<T extends (...args: any[]) => any>(
	func: T,
	wait: number,
): (...args: Parameters<T>) => void {
	let timeout: NodeJS.Timeout;

	return (...args: Parameters<T>) => {
		clearTimeout(timeout);
		timeout = setTimeout(() => func(...args), wait);
	};
}

/**
 * Retry function for health checks
 */
export async function retry<T>(fn: () => Promise<T>, maxRetries = 3, delay = 1000): Promise<T> {
	let lastError: Error;

	for (let i = 0; i < maxRetries; i++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error as Error;
			if (i < maxRetries - 1) {
				await new Promise((resolve) => setTimeout(resolve, delay));
			}
		}
	}

	throw lastError!;
}

/**
 * Memory usage utilities
 */
export const MemoryUtils = {
	getUsage: () => {
		const usage = process.memoryUsage();
		return {
			rss: formatBytes(usage.rss),
			heapTotal: formatBytes(usage.heapTotal),
			heapUsed: formatBytes(usage.heapUsed),
			external: formatBytes(usage.external),
			percentage: Math.round((usage.heapUsed / usage.heapTotal) * 100),
		};
	},

	isHighUsage: (threshold = 90): boolean => {
		const usage = process.memoryUsage();
		return (usage.heapUsed / usage.heapTotal) * 100 > threshold;
	},
};

/**
 * CPU usage utilities
 */
export const CPUUtils = {
	getUsage: () => {
		const usage = process.cpuUsage();
		return {
			user: usage.user,
			system: usage.system,
		};
	},
};
