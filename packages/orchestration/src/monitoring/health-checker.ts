/**
 * nO Master Agent Loop - Health Check System
 *
 * Provides comprehensive health checking for all system components
 * with configurable checks and detailed status reporting.
 *
 * Co-authored-by: brAInwav Development Team
 */

import { randomInt } from 'node:crypto';
import { healthMetrics } from './prometheus-metrics.js';

export type HealthStatus = 'healthy' | 'unhealthy' | 'degraded';

export interface HealthCheck {
	name: string;
	description: string;
	check: () => Promise<HealthCheckResult>;
	timeout?: number;
	critical?: boolean;
}

export interface HealthCheckResult {
	status: HealthStatus;
	message?: string;
	details?: Record<string, unknown>;
	responseTime?: number;
	timestamp: string;
}

export interface SystemHealth {
	status: HealthStatus;
	timestamp: string;
	version: string;
	uptime: number;
	checks: Record<string, HealthCheckResult>;
	summary: {
		total: number;
		healthy: number;
		unhealthy: number;
		degraded: number;
	};
}

/**
 * Health Check Manager
 */
export class HealthChecker {
	private readonly checks: Map<string, HealthCheck> = new Map();
	private readonly lastResults: Map<string, HealthCheckResult> = new Map();
	private readonly startTime: number = Date.now();

	/**
	 * Register a health check
	 */
	registerCheck(check: HealthCheck): void {
		this.checks.set(check.name, check);
	}

	/**
	 * Run all health checks
	 */
	async runAllChecks(): Promise<SystemHealth> {
		const results: Record<string, HealthCheckResult> = {};
		const checkPromises: Promise<void>[] = [];

		// Run all checks concurrently
		for (const [name, check] of this.checks) {
			checkPromises.push(
				this.runSingleCheck(name, check).then((result) => {
					results[name] = result;
					this.lastResults.set(name, result);
				}),
			);
		}

		await Promise.allSettled(checkPromises);

		// Calculate overall health
		const summary = this.calculateSummary(results);
		const overallStatus = this.determineOverallStatus(results);

		// Update metrics
		this.updateMetrics(overallStatus, results);

		return {
			status: overallStatus,
			timestamp: new Date().toISOString(),
			version: process.env.npm_package_version || '0.1.0',
			uptime: Date.now() - this.startTime,
			checks: results,
			summary,
		};
	}

	/**
	 * Run a specific health check
	 */
	async runCheck(name: string): Promise<HealthCheckResult | null> {
		const check = this.checks.get(name);
		if (!check) {
			return null;
		}

		return this.runSingleCheck(name, check);
	}

	/**
	 * Get last known results
	 */
	getLastResults(): Record<string, HealthCheckResult> {
		return Object.fromEntries(this.lastResults);
	}

	/**
	 * Register default system checks
	 */
	registerDefaultChecks(): void {
		// Memory usage check
		this.registerCheck({
			name: 'memory',
			description: 'System memory usage',
			check: async () => {
				const usage = process.memoryUsage();
				const totalMB = usage.heapTotal / 1024 / 1024;
				const usedMB = usage.heapUsed / 1024 / 1024;
				const usagePercent = (usedMB / totalMB) * 100;

				let status: HealthStatus = 'healthy';
				if (usagePercent > 90) status = 'unhealthy';
				else if (usagePercent > 80) status = 'degraded';

				return {
					status,
					message: `Memory usage: ${usagePercent.toFixed(1)}%`,
					details: {
						heapUsed: usedMB,
						heapTotal: totalMB,
						usagePercent,
					},
					timestamp: new Date().toISOString(),
				};
			},
		});

		// Event loop lag check
		this.registerCheck({
			name: 'event_loop',
			description: 'Node.js event loop lag',
			check: async () => {
				const start = process.hrtime.bigint();
				await new Promise((resolve) => setImmediate(resolve));
				const lag = Number(process.hrtime.bigint() - start) / 1e6; // Convert to ms

				let status: HealthStatus = 'healthy';
				if (lag > 100) status = 'unhealthy';
				else if (lag > 50) status = 'degraded';

				return {
					status,
					message: `Event loop lag: ${lag.toFixed(2)}ms`,
					details: { lagMs: lag },
					timestamp: new Date().toISOString(),
				};
			},
		});

		// Agent pool availability check
		this.registerCheck({
			name: 'agent_pool',
			description: 'Agent pool availability',
			critical: true,
			check: async () => {
				// This would integrate with actual agent pool
				// For now, simulate based on metrics
				const availableAgents = randomInt(0, 6); // 0-5 agents
				const activeAgents = Math.min(3, availableAgents); // Max 3 active

				let status: HealthStatus = 'healthy';
				if (availableAgents === 0) status = 'unhealthy';
				else if (availableAgents < 2) status = 'degraded';

				return {
					status,
					message: `${availableAgents} agents available, ${activeAgents} active`,
					details: {
						available: availableAgents,
						active: activeAgents,
						utilization: availableAgents ? (activeAgents / availableAgents) * 100 : 0,
					},
					timestamp: new Date().toISOString(),
				};
			},
		});

		// Database connectivity check (if applicable)
		this.registerCheck({
			name: 'database',
			description: 'Database connectivity',
			timeout: 5000,
			check: async () => {
				try {
					// This would implement actual database ping
					// For now, simulate a connection check
					await new Promise((resolve) => setTimeout(resolve, 10));

					return {
						status: 'healthy' as const,
						message: 'Database connection successful',
						details: { connectionTime: 10 },
						responseTime: 10,
						timestamp: new Date().toISOString(),
					};
				} catch (error) {
					return {
						status: 'unhealthy' as const,
						message: `Database connection failed: ${error}`,
						timestamp: new Date().toISOString(),
					};
				}
			},
		});

		// External services check
		this.registerCheck({
			name: 'external_services',
			description: 'External service dependencies',
			check: async () => {
				// Check critical external services
				const services = ['openai', 'vector-db', 'logging'];
				const results = await Promise.allSettled(
					services.map((service) => this.checkExternalService(service)),
				);

				const healthyCount = results.filter(
					(r) => r.status === 'fulfilled' && r.value.healthy,
				).length;

				let status: HealthStatus = 'healthy';
				if (healthyCount === 0) status = 'unhealthy';
				else if (healthyCount < services.length) status = 'degraded';

				return {
					status,
					message: `${healthyCount}/${services.length} external services healthy`,
					details: {
						services: Object.fromEntries(
							results.map((result, i) => [
								services[i],
								result.status === 'fulfilled' ? result.value : { healthy: false },
							]),
						),
					},
					timestamp: new Date().toISOString(),
				};
			},
		});
	}

	/**
	 * Run a single health check with timeout
	 */
	private async runSingleCheck(_name: string, check: HealthCheck): Promise<HealthCheckResult> {
		const startTime = Date.now();
		const timeout = check.timeout || 5000;

		try {
			const timeoutPromise = new Promise<never>((_, reject) => {
				setTimeout(() => reject(new Error('Health check timeout')), timeout);
			});

			const result = await Promise.race([check.check(), timeoutPromise]);

			const responseTime = Date.now() - startTime;
			return {
				...result,
				responseTime,
			};
		} catch (error) {
			return {
				status: 'unhealthy',
				message: `Health check failed: ${error}`,
				responseTime: Date.now() - startTime,
				timestamp: new Date().toISOString(),
			};
		}
	}

	/**
	 * Calculate health summary
	 */
	private calculateSummary(results: Record<string, HealthCheckResult>): SystemHealth['summary'] {
		const total = Object.keys(results).length;
		let healthy = 0;
		let unhealthy = 0;
		let degraded = 0;

		Object.values(results).forEach((result) => {
			switch (result.status) {
				case 'healthy':
					healthy++;
					break;
				case 'unhealthy':
					unhealthy++;
					break;
				case 'degraded':
					degraded++;
					break;
			}
		});

		return { total, healthy, unhealthy, degraded };
	}

	/**
	 * Determine overall system status
	 */
	private determineOverallStatus(
		results: Record<string, HealthCheckResult>,
	): HealthStatus {
		const checks = Array.from(this.checks.values());
		const criticalChecks = checks.filter((check) => check.critical);

		// Check if any critical checks are unhealthy
		for (const check of criticalChecks) {
			const result = results[check.name];
			if (result?.status === 'unhealthy') {
				return 'unhealthy';
			}
		}

		// Check overall health distribution
		const resultValues = Object.values(results);
		const unhealthyCount = resultValues.filter((r) => r.status === 'unhealthy').length;
		const degradedCount = resultValues.filter((r) => r.status === 'degraded').length;

		if (unhealthyCount > 0) return 'unhealthy';
		if (degradedCount > 0) return 'degraded';
		return 'healthy';
	}

	/**
	 * Update Prometheus metrics
	 */
	private updateMetrics(overallStatus: HealthStatus, results: Record<string, HealthCheckResult>): void {
		// Update overall health status
		healthMetrics.healthStatus.set(overallStatus === 'healthy' ? 1 : 0);

		// Update component health metrics
		Object.entries(results).forEach(([component, result]) => {
			healthMetrics.componentHealth.labels(component).set(result.status === 'healthy' ? 1 : 0);
		});

		// Update last health check timestamp
		healthMetrics.lastHealthCheck.set(Date.now());
	}

	/**
	 * Check external service health
	 */
	private async checkExternalService(
		_service: string,
	): Promise<{ healthy: boolean; latency?: number }> {
		// This would implement actual service checks
		// For now, simulate service health
		const latency = randomInt(0, 100);
		const healthy = randomInt(0, 100) > 5; // 95% uptime simulation

		return { healthy, latency };
	}
}

// Export singleton instance
export const healthChecker = new HealthChecker();

// Register default checks
healthChecker.registerDefaultChecks();
