/**
 * nO Master Agent Loop - Health Check System
 * Part of brAInwav's production-ready nO implementation
 *
 * Comprehensive health checking for all system components
 * with detailed diagnostics and dependency verification
 */

import { EventEmitter } from 'node:events';
import { totalmem } from 'node:os';

export interface HealthCheckResult {
	name: string;
	status: 'healthy' | 'degraded' | 'unhealthy';
	timestamp: Date;
	responseTime: number;
	details?: any;
	error?: string;
}

export interface SystemHealth {
	overall: 'healthy' | 'degraded' | 'unhealthy';
	timestamp: Date;
	checks: HealthCheckResult[];
	uptime: number;
	version: string;
}

export interface HealthCheck {
	name: string;
	check: () => Promise<HealthCheckResult>;
	interval?: number;
	timeout?: number;
	critical?: boolean;
}

export class HealthChecker extends EventEmitter {
	private checks: Map<string, HealthCheck> = new Map();
	private results: Map<string, HealthCheckResult> = new Map();
	private intervals: Map<string, NodeJS.Timeout> = new Map();
	private startTime: Date = new Date();

	constructor(
		private config: {
			defaultTimeout?: number;
			defaultInterval?: number;
		} = {},
	) {
		super();
		this.config.defaultTimeout = config.defaultTimeout || 5000;
		this.config.defaultInterval = config.defaultInterval || 30000;
	}

	/**
	 * Register a health check
	 */
	register(check: HealthCheck): void {
		this.checks.set(check.name, check);

		// Start periodic checking if interval is specified
		if (check.interval || this.config.defaultInterval) {
			const interval = check.interval || this.config.defaultInterval!;
			const timer = setInterval(async () => {
				await this.runCheck(check.name);
			}, interval);

			this.intervals.set(check.name, timer);
		}
	}

	/**
	 * Unregister a health check
	 */
	unregister(name: string): boolean {
		const interval = this.intervals.get(name);
		if (interval) {
			clearInterval(interval);
			this.intervals.delete(name);
		}

		this.results.delete(name);
		return this.checks.delete(name);
	}

	/**
	 * Run a specific health check
	 */
	async runCheck(name: string): Promise<HealthCheckResult> {
		const check = this.checks.get(name);
		if (!check) {
			throw new Error(`Health check '${name}' not found`);
		}

		const startTime = Date.now();
		const timeout = check.timeout || this.config.defaultTimeout!;

		try {
			const result = await Promise.race([
				check.check(),
				new Promise<never>((_, reject) =>
					setTimeout(() => reject(new Error('Health check timeout')), timeout),
				),
			]);

			result.responseTime = Date.now() - startTime;
			result.timestamp = new Date();

			this.results.set(name, result);
			this.emit('check-completed', result);

			return result;
		} catch (error) {
			const result: HealthCheckResult = {
				name,
				status: 'unhealthy',
				timestamp: new Date(),
				responseTime: Date.now() - startTime,
				error: error instanceof Error ? error.message : String(error),
			};

			this.results.set(name, result);
			this.emit('check-failed', result);

			return result;
		}
	}

	/**
	 * Run all health checks
	 */
	async runAllChecks(): Promise<HealthCheckResult[]> {
		const promises = Array.from(this.checks.keys()).map((name) =>
			this.runCheck(name).catch((error) => ({
				name,
				status: 'unhealthy' as const,
				timestamp: new Date(),
				responseTime: 0,
				error: error.message,
			})),
		);

		return Promise.all(promises);
	}

	/**
	 * Get current system health status
	 */
	async getSystemHealth(): Promise<SystemHealth> {
		const checks = await this.runAllChecks();
		const criticalChecks = checks.filter((result) => {
			const check = this.checks.get(result.name);
			return check?.critical !== false; // Default to critical
		});

		let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

		// Determine overall status
		const unhealthyCount = checks.filter((c) => c.status === 'unhealthy').length;
		const degradedCount = checks.filter((c) => c.status === 'degraded').length;
		const criticalUnhealthy = criticalChecks.filter((c) => c.status === 'unhealthy').length;

		if (criticalUnhealthy > 0 || unhealthyCount > checks.length / 2) {
			overall = 'unhealthy';
		} else if (unhealthyCount > 0 || degradedCount > 0) {
			overall = 'degraded';
		}

		return {
			overall,
			timestamp: new Date(),
			checks,
			uptime: Date.now() - this.startTime.getTime(),
			version: process.env.NO_VERSION || '1.0.0',
		};
	}

	/**
	 * Get liveness probe result (basic system availability)
	 */
	async getLivenessProbe(): Promise<{ status: string; timestamp: Date }> {
		return {
			status: 'alive',
			timestamp: new Date(),
		};
	}

	/**
	 * Get readiness probe result (system ready to serve requests)
	 */
	async getReadinessProbe(): Promise<{ status: string; ready: boolean; timestamp: Date }> {
		const health = await this.getSystemHealth();
		return {
			status: health.overall,
			ready: health.overall !== 'unhealthy',
			timestamp: new Date(),
		};
	}

	/**
	 * Start all periodic health checks
	 */
	start(): void {
		for (const [name, check] of this.checks) {
			if (!this.intervals.has(name) && (check.interval || this.config.defaultInterval)) {
				const interval = check.interval || this.config.defaultInterval!;
				const timer = setInterval(async () => {
					await this.runCheck(name);
				}, interval);

				this.intervals.set(name, timer);
			}
		}

		this.emit('started');
	}

	/**
	 * Stop all periodic health checks
	 */
	stop(): void {
		for (const [_name, timer] of this.intervals) {
			clearInterval(timer);
		}
		this.intervals.clear();
		this.emit('stopped');
	}

	/**
	 * Get the latest result for a specific check
	 */
	getCheckResult(name: string): HealthCheckResult | undefined {
		return this.results.get(name);
	}

	/**
	 * Get all latest results
	 */
	getAllResults(): HealthCheckResult[] {
		return Array.from(this.results.values());
	}
}

/**
 * Standard health check implementations for nO components
 */
export class StandardHealthChecks {
	/**
	 * Database connectivity check
	 */
	static database(connectionTest: () => Promise<boolean>): HealthCheck {
		return {
			name: 'database',
			critical: true,
			check: async (): Promise<HealthCheckResult> => {
				try {
					const isConnected = await connectionTest();
					return {
						name: 'database',
						status: isConnected ? 'healthy' : 'unhealthy',
						timestamp: new Date(),
						responseTime: 0,
						details: { connected: isConnected },
					};
				} catch (error) {
					return {
						name: 'database',
						status: 'unhealthy',
						timestamp: new Date(),
						responseTime: 0,
						error: error instanceof Error ? error.message : String(error),
					};
				}
			},
		};
	}

	/**
	 * Redis cache connectivity check
	 */
	static redis(redisClient: any): HealthCheck {
		return {
			name: 'redis',
			critical: false,
			check: async (): Promise<HealthCheckResult> => {
				try {
					await redisClient.ping();
					return {
						name: 'redis',
						status: 'healthy',
						timestamp: new Date(),
						responseTime: 0,
						details: { connected: true },
					};
				} catch (error) {
					return {
						name: 'redis',
						status: 'degraded',
						timestamp: new Date(),
						responseTime: 0,
						error: error instanceof Error ? error.message : String(error),
					};
				}
			},
		};
	}

	/**
	 * Memory usage check
	 */
	static memory(
		thresholds: { warning: number; critical: number } = { warning: 0.8, critical: 0.95 },
	): HealthCheck {
		return {
			name: 'memory',
			check: async (): Promise<HealthCheckResult> => {
				const usage = process.memoryUsage();
				const totalMem = totalmem();
				const usedRatio = usage.heapUsed / totalMem;

				let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
				if (usedRatio > thresholds.critical) {
					status = 'unhealthy';
				} else if (usedRatio > thresholds.warning) {
					status = 'degraded';
				}

				return {
					name: 'memory',
					status,
					timestamp: new Date(),
					responseTime: 0,
					details: {
						heapUsed: usage.heapUsed,
						heapTotal: usage.heapTotal,
						external: usage.external,
						usedRatio,
						thresholds,
					},
				};
			},
		};
	}

	/**
	 * Agent pool health check
	 */
	static agentPool(
		getPoolStatus: () => Promise<{ active: number; total: number; healthy: number }>,
	): HealthCheck {
		return {
			name: 'agent-pool',
			critical: true,
			check: async (): Promise<HealthCheckResult> => {
				try {
					const poolStatus = await getPoolStatus();
					const healthyRatio = poolStatus.healthy / poolStatus.total;

					let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
					if (healthyRatio < 0.5) {
						status = 'unhealthy';
					} else if (healthyRatio < 0.8) {
						status = 'degraded';
					}

					return {
						name: 'agent-pool',
						status,
						timestamp: new Date(),
						responseTime: 0,
						details: {
							...poolStatus,
							healthyRatio,
						},
					};
				} catch (error) {
					return {
						name: 'agent-pool',
						status: 'unhealthy',
						timestamp: new Date(),
						responseTime: 0,
						error: error instanceof Error ? error.message : String(error),
					};
				}
			},
		};
	}
}
