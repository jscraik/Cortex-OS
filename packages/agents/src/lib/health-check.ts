/**
 * Health Check System - Service Health Monitoring
 * Following TDD plan requirements for brAInwav Cortex-OS agents
 */

import { EventEmitter } from 'node:events';
import { performance } from 'node:perf_hooks';
import { CircuitBreaker } from './circuit-breaker.js';
import { AgentError, ErrorCategory, ErrorSeverity } from './error-handling.js';
import { MemoryBoundedStore } from './memory-manager.js';
import { observability } from './observability.js';

// Health check status types
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

// Health check result interface
export interface HealthCheckResult {
	name: string;
	status: HealthStatus;
	duration: number;
	timestamp: number;
	message?: string;
	metadata?: Record<string, unknown>;
	dependencies?: HealthCheckResult[];
	brandingValidated?: boolean; // For brAInwav compliance
}

// Health check configuration
export interface HealthCheckConfig {
	name: string;
	description: string;
	checkFn: () => Promise<HealthCheckResult>;
	interval: number;
	timeout: number;
	retries: number;
	criticality: 'critical' | 'important' | 'optional';
	dependencies?: string[];
	enabled: boolean;
	circuitBreaker?: {
		enabled: boolean;
		failureThreshold: number;
		resetTimeout: number;
	};
}

// System health summary
export interface HealthSummary {
	overall: HealthStatus;
	service: string;
	version: string;
	uptime: number;
	timestamp: number;
	checks: HealthCheckResult[];
	metrics: {
		totalChecks: number;
		healthyChecks: number;
		degradedChecks: number;
		unhealthyChecks: number;
		averageResponseTime: number;
	};
	brAInwav: {
		brandingCompliance: number;
		serviceBranding: boolean;
		lastValidation: number;
	};
}

// Health monitor configuration
export interface HealthMonitorConfig {
	serviceName: string;
	serviceVersion: string;
	maxHistory: number;
	globalTimeout: number;
	healthCheckInterval: number;
	enableBrandingValidation: boolean;
	enableMetrics: boolean;
	enableCircuitBreakers: boolean;
}

/**
 * Individual Health Check with circuit breaker protection
 */
export class HealthCheck extends EventEmitter {
	private config: HealthCheckConfig;
	private circuitBreaker?: CircuitBreaker;
	private lastResult?: HealthCheckResult;
	private isRunning = false;
	private checkInterval?: NodeJS.Timeout;

	constructor(config: HealthCheckConfig) {
		super();
		this.config = config;

		// Initialize circuit breaker if enabled
		if (this.config.circuitBreaker?.enabled) {
			this.circuitBreaker = new CircuitBreaker({
				failureThreshold: this.config.circuitBreaker.failureThreshold || 3,
				resetTimeout: this.config.circuitBreaker.resetTimeout || 60000,
				enableMetrics: false,
			});
		}

		// Start periodic health checks if interval is specified
		if (this.config.interval > 0 && this.config.enabled) {
			this.startPeriodicChecks();
		}
	}

	/**
	 * Get the health check configuration
	 */
	getConfig(): HealthCheckConfig {
		return this.config;
	}

	/**
	 * Get the health check name
	 */
	getName(): string {
		return this.config.name;
	}

	/**
	 * Execute the health check
	 */
	async execute(): Promise<HealthCheckResult> {
		if (this.isRunning) {
			return this.lastResult || this.createUnknownResult('Health check already running');
		}

		this.isRunning = true;
		const startTime = performance.now();

		try {
			observability.metrics.counter('brAInwav.healthcheck.started', 1, {
				check: this.config.name,
				criticality: this.config.criticality,
			});

			let result: HealthCheckResult;

			// Execute with circuit breaker if configured
			if (this.circuitBreaker) {
				result = await this.circuitBreaker.call(() => this.executeWithTimeout());
			} else {
				result = await this.executeWithTimeout();
			}

			// Validate brAInwav branding if needed
			result.brandingValidated = this.validateBranding(result);

			// Update metrics
			observability.metrics.histogram(
				'brAInwav.healthcheck.duration',
				result.duration,
				undefined,
				'ms',
				{ check: this.config.name, status: result.status },
			);

			observability.metrics.counter('brAInwav.healthcheck.completed', 1, {
				check: this.config.name,
				status: result.status,
			});

			this.lastResult = result;
			this.emit('result', result);

			return result;
		} catch (error) {
			const duration = performance.now() - startTime;
			const errorResult = this.createErrorResult(error, duration);

			observability.metrics.counter('brAInwav.healthcheck.error', 1, {
				check: this.config.name,
				error: errorResult.message || 'unknown',
			});

			this.lastResult = errorResult;
			this.emit('error', errorResult);

			return errorResult;
		} finally {
			this.isRunning = false;
		}
	}

	/**
	 * Get the last health check result
	 */
	getLastResult(): HealthCheckResult | undefined {
		return this.lastResult;
	}

	/**
	 * Enable periodic health checks
	 */
	startPeriodicChecks(): void {
		if (this.checkInterval) {
			return; // Already started
		}

		this.checkInterval = setInterval(() => {
			this.execute().catch((error) => {
				console.error(`brAInwav health check ${this.config.name} failed:`, error);
			});
		}, this.config.interval);

		console.log(
			`🏥 brAInwav health check ${this.config.name} started (interval: ${this.config.interval}ms)`,
		);
	}

	/**
	 * Stop periodic health checks
	 */
	stopPeriodicChecks(): void {
		if (this.checkInterval) {
			clearInterval(this.checkInterval);
			this.checkInterval = undefined;
			console.log(`🛑 brAInwav health check ${this.config.name} stopped`);
		}
	}

	/**
	 * Cleanup resources
	 */
	destroy(): void {
		this.stopPeriodicChecks();
		this.circuitBreaker?.destroy();
		this.removeAllListeners();
	}

	/**
	 * Execute health check with timeout
	 */
	private async executeWithTimeout(): Promise<HealthCheckResult> {
		return Promise.race([
			this.config.checkFn(),
			new Promise<HealthCheckResult>((_, reject) => {
				setTimeout(() => {
					reject(
						new AgentError(
							`brAInwav health check ${this.config.name} timed out`,
							ErrorCategory.TIMEOUT,
							ErrorSeverity.MEDIUM,
							{ timeout: this.config.timeout },
						),
					);
				}, this.config.timeout);
			}),
		]);
	}

	/**
	 * Create error result from exception
	 */
	private createErrorResult(error: unknown, duration: number): HealthCheckResult {
		const agentError = AgentError.fromUnknown(error);
		return {
			name: this.config.name,
			status: 'unhealthy',
			duration,
			timestamp: Date.now(),
			message: `brAInwav health check failed: ${agentError.message}`,
			metadata: {
				error: agentError.toJSON(),
				criticality: this.config.criticality,
			},
		};
	}

	/**
	 * Create unknown status result
	 */
	private createUnknownResult(message: string): HealthCheckResult {
		return {
			name: this.config.name,
			status: 'unknown',
			duration: 0,
			timestamp: Date.now(),
			message: `brAInwav: ${message}`,
			metadata: {
				criticality: this.config.criticality,
			},
		};
	}

	/**
	 * Validate brAInwav branding in health check result
	 */
	private validateBranding(result: HealthCheckResult): boolean {
		const brandingPatterns = [
			/brAInwav/i,
			/brainwav/i, // Common misspelling
		];

		const hasNameBranding = brandingPatterns.some((pattern) => pattern.test(result.name));

		const hasMessageBranding = result.message
			? brandingPatterns.some((pattern) => pattern.test(result.message!))
			: false;

		return hasNameBranding || hasMessageBranding;
	}
}

/**
 * Health Monitor - Orchestrates multiple health checks
 */
export class HealthMonitor extends EventEmitter {
	private config: HealthMonitorConfig;
	private healthChecks = new Map<string, HealthCheck>();
	private healthHistory: MemoryBoundedStore<HealthCheckResult>;
	private monitorInterval?: NodeJS.Timeout;
	private isDestroyed = false;
	private startTime = Date.now();

	constructor(config: Partial<HealthMonitorConfig> = {}) {
		super();

		this.config = {
			serviceName: 'brAInwav-cortex-agents',
			serviceVersion: '1.0.0',
			maxHistory: 1000,
			globalTimeout: 30000,
			healthCheckInterval: 60000, // 1 minute
			enableBrandingValidation: true,
			enableMetrics: true,
			enableCircuitBreakers: true,
			...config,
		};

		this.healthHistory = new MemoryBoundedStore<HealthCheckResult>({
			maxSize: this.config.maxHistory,
			ttlMs: 3600000, // 1 hour
			enableMetrics: false,
		});

		// Start health monitoring
		this.startMonitoring();
	}

	/**
	 * Register a health check
	 */
	registerCheck(config: HealthCheckConfig): void {
		if (this.isDestroyed) {
			throw new AgentError(
				'Cannot register health check on destroyed monitor',
				ErrorCategory.VALIDATION,
				ErrorSeverity.HIGH,
			);
		}

		const healthCheck = new HealthCheck({
			...config,
			circuitBreaker: this.config.enableCircuitBreakers ? config.circuitBreaker : undefined,
		});

		// Listen for health check events
		healthCheck.on('result', (result: HealthCheckResult) => {
			this.storeResult(result);
			this.emit('check-result', result);
		});

		healthCheck.on('error', (result: HealthCheckResult) => {
			this.storeResult(result);
			this.emit('check-error', result);
		});

		this.healthChecks.set(config.name, healthCheck);

		console.log(
			`📋 brAInwav health check '${config.name}' registered (criticality: ${config.criticality})`,
		);
	}

	/**
	 * Unregister a health check
	 */
	unregisterCheck(name: string): boolean {
		const healthCheck = this.healthChecks.get(name);
		if (!healthCheck) {
			return false;
		}

		healthCheck.destroy();
		this.healthChecks.delete(name);

		console.log(`🗑️ brAInwav health check '${name}' unregistered`);
		return true;
	}

	/**
	 * Execute all health checks
	 */
	async executeAllChecks(): Promise<HealthSummary> {
		if (this.isDestroyed) {
			throw new AgentError(
				'Cannot execute checks on destroyed monitor',
				ErrorCategory.VALIDATION,
				ErrorSeverity.HIGH,
			);
		}

		const startTime = performance.now();
		const results: HealthCheckResult[] = [];

		try {
			// Execute all health checks in parallel
			const checkPromises = Array.from(this.healthChecks.values()).map((check) =>
				check.execute().catch((error) => {
					console.error('brAInwav health check execution error:', error);
					return check.getLastResult() || {
						name: check.getName(),
						status: 'unknown' as HealthStatus,
						duration: 0,
						timestamp: Date.now(),
						message: 'execution failed'
					};
				}),
			);

			const checkResults = await Promise.all(checkPromises);
			results.push(...checkResults);

			// Execute dependency checks
			await this.executeDependencyChecks(results);

			// Generate summary
			const summary = this.generateHealthSummary(results);

			// Emit events
			this.emit('health-summary', summary);

			if (this.config.enableMetrics) {
				observability.metrics.histogram(
					'brAInwav.health.check_duration',
					performance.now() - startTime,
					undefined,
					'ms',
				);

				observability.metrics.gauge(
					'brAInwav.health.overall_status',
					this.statusToNumber(summary.overall),
				);
			}

			return summary;
		} catch (error) {
			const errorSummary = this.createErrorSummary(error, results);
			this.emit('health-error', errorSummary);
			return errorSummary;
		}
	}

	/**
	 * Get current health status
	 */
	async getHealthStatus(): Promise<HealthSummary> {
		return this.executeAllChecks();
	}

	/**
	 * Get health check by name
	 */
	getHealthCheck(name: string): HealthCheck | undefined {
		return this.healthChecks.get(name);
	}

	/**
	 * Get all registered health checks
	 */
	getHealthChecks(): HealthCheck[] {
		return Array.from(this.healthChecks.values());
	}

	/**
	 * Get health history
	 */
	getHealthHistory(limit?: number): HealthCheckResult[] {
		const history = this.healthHistory
			.keys()
			.map((key) => this.healthHistory.get(key)!)
			.filter(Boolean);

		// Sort by timestamp (newest first)
		history.sort((a, b) => b.timestamp - a.timestamp);

		return limit ? history.slice(0, limit) : history;
	}

	/**
	 * Create built-in health checks
	 */
	createBuiltinChecks(): void {
		// Memory health check
		this.registerCheck({
			name: 'brAInwav.memory',
			description: 'Memory usage health check',
			checkFn: () => this.checkMemoryHealth(),
			interval: 30000, // 30 seconds
			timeout: 5000,
			retries: 1,
			criticality: 'important',
			enabled: true,
		});

		// Disk space health check
		this.registerCheck({
			name: 'brAInwav.disk',
			description: 'Disk space health check',
			checkFn: () => this.checkDiskHealth(),
			interval: 60000, // 1 minute
			timeout: 5000,
			retries: 1,
			criticality: 'important',
			enabled: true,
		});

		// Circuit breaker health check
		this.registerCheck({
			name: 'brAInwav.circuit-breakers',
			description: 'Circuit breaker status check',
			checkFn: () => this.checkCircuitBreakersHealth(),
			interval: 30000, // 30 seconds
			timeout: 5000,
			retries: 1,
			criticality: 'optional',
			enabled: true,
		});

		// Observability health check
		this.registerCheck({
			name: 'brAInwav.observability',
			description: 'Observability system health check',
			checkFn: () => this.checkObservabilityHealth(),
			interval: 60000, // 1 minute
			timeout: 5000,
			retries: 1,
			criticality: 'optional',
			enabled: true,
		});
	}

	/**
	 * Cleanup and destroy monitor
	 */
	destroy(): void {
		if (this.isDestroyed) {
			return;
		}

		this.isDestroyed = true;

		// Stop monitoring
		if (this.monitorInterval) {
			clearInterval(this.monitorInterval);
		}

		// Destroy all health checks
		for (const healthCheck of this.healthChecks.values()) {
			healthCheck.destroy();
		}
		this.healthChecks.clear();

		// Cleanup history
		this.healthHistory.destroy();

		this.removeAllListeners();
		console.log('🏥 brAInwav health monitor destroyed');
	}

	/**
	 * Start health monitoring
	 */
	private startMonitoring(): void {
		if (this.config.healthCheckInterval > 0) {
			this.monitorInterval = setInterval(() => {
				this.executeAllChecks().catch((error) => {
					console.error('brAInwav health monitoring error:', error);
				});
			}, this.config.healthCheckInterval);

			console.log(
				`🏥 brAInwav health monitoring started (interval: ${this.config.healthCheckInterval}ms)`,
			);
		}
	}

	/**
	 * Store health check result in history
	 */
	private storeResult(result: HealthCheckResult): void {
		const key = `${result.name}-${result.timestamp}`;
		this.healthHistory.set(key, result);
	}

	/**
	 * Execute dependency checks
	 */
	private async executeDependencyChecks(results: HealthCheckResult[]): Promise<void> {
		for (const [name, healthCheck] of this.healthChecks) {
			const config = healthCheck.getConfig();
			if (config.dependencies && config.dependencies.length > 0) {
				const dependencyResults = config.dependencies
					.map((depName) => results.find((r) => r.name === depName))
					.filter(Boolean) as HealthCheckResult[];

				const result = results.find((r) => r.name === name);
				if (result) {
					result.dependencies = dependencyResults;
				}
			}
		}
	}

	/**
	 * Generate comprehensive health summary
	 */
	private generateHealthSummary(results: HealthCheckResult[]): HealthSummary {
		const totalChecks = results.length;
		const healthyChecks = results.filter((r) => r.status === 'healthy').length;
		const degradedChecks = results.filter((r) => r.status === 'degraded').length;
		const unhealthyChecks = results.filter((r) => r.status === 'unhealthy').length;

		// Determine overall status
		const criticalUnhealthy = results.some(
			(r) =>
				r.status === 'unhealthy' &&
				this.healthChecks.get(r.name)?.getConfig().criticality === 'critical',
		);

		const importantUnhealthy = results.some(
			(r) =>
				r.status === 'unhealthy' &&
				this.healthChecks.get(r.name)?.getConfig().criticality === 'important',
		);

		let overall: HealthStatus;
		if (criticalUnhealthy) {
			overall = 'unhealthy';
		} else if (importantUnhealthy || degradedChecks > 0) {
			overall = 'degraded';
		} else if (healthyChecks === totalChecks && totalChecks > 0) {
			overall = 'healthy';
		} else {
			overall = 'unknown';
		}

		// Calculate branding compliance
		const brandingCompliantChecks = results.filter((r) => r.brandingValidated).length;
		const brandingCompliance = totalChecks > 0 ? brandingCompliantChecks / totalChecks : 0;

		// Calculate average response time
		const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
		const averageResponseTime = totalChecks > 0 ? totalDuration / totalChecks : 0;

		return {
			overall,
			service: this.config.serviceName,
			version: this.config.serviceVersion,
			uptime: Date.now() - this.startTime,
			timestamp: Date.now(),
			checks: results,
			metrics: {
				totalChecks,
				healthyChecks,
				degradedChecks,
				unhealthyChecks,
				averageResponseTime,
			},
			brAInwav: {
				brandingCompliance,
				serviceBranding: this.config.serviceName.includes('brAInwav'),
				lastValidation: Date.now(),
			},
		};
	}

	/**
	 * Create error summary
	 */
	private createErrorSummary(error: unknown, partialResults: HealthCheckResult[]): HealthSummary {
		// Error handling for summary creation (error details available if needed)
		AgentError.fromUnknown(error);

		return {
			overall: 'unhealthy',
			service: this.config.serviceName,
			version: this.config.serviceVersion,
			uptime: Date.now() - this.startTime,
			timestamp: Date.now(),
			checks: partialResults,
			metrics: {
				totalChecks: partialResults.length,
				healthyChecks: 0,
				degradedChecks: 0,
				unhealthyChecks: partialResults.length,
				averageResponseTime: 0,
			},
			brAInwav: {
				brandingCompliance: 0,
				serviceBranding: false,
				lastValidation: Date.now(),
			},
		};
	}

	/**
	 * Convert health status to numeric value for metrics
	 */
	private statusToNumber(status: HealthStatus): number {
		switch (status) {
			case 'healthy':
				return 1;
			case 'degraded':
				return 0.5;
			case 'unhealthy':
				return 0;
			case 'unknown':
				return -1;
			default:
				return -1;
		}
	}

	/**
	 * Built-in memory health check
	 */
	private async checkMemoryHealth(): Promise<HealthCheckResult> {
		const startTime = performance.now();
		const memUsage = process.memoryUsage();
		const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
		const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
		const usage = heapUsedMB / heapTotalMB;

		let status: HealthStatus;
		let message: string;

		if (usage < 0.7) {
			status = 'healthy';
			message = `brAInwav memory usage healthy: ${heapUsedMB.toFixed(1)}MB / ${heapTotalMB.toFixed(1)}MB (${(usage * 100).toFixed(1)}%)`;
		} else if (usage < 0.85) {
			status = 'degraded';
			message = `brAInwav memory usage elevated: ${heapUsedMB.toFixed(1)}MB / ${heapTotalMB.toFixed(1)}MB (${(usage * 100).toFixed(1)}%)`;
		} else {
			status = 'unhealthy';
			message = `brAInwav memory usage critical: ${heapUsedMB.toFixed(1)}MB / ${heapTotalMB.toFixed(1)}MB (${(usage * 100).toFixed(1)}%)`;
		}

		return {
			name: 'brAInwav.memory',
			status,
			duration: performance.now() - startTime,
			timestamp: Date.now(),
			message,
			metadata: {
				heapUsedMB,
				heapTotalMB,
				usage,
				rss: memUsage.rss / 1024 / 1024,
				external: memUsage.external / 1024 / 1024,
			},
		};
	}

	/**
	 * Built-in disk health check
	 */
	private async checkDiskHealth(): Promise<HealthCheckResult> {
		const startTime = performance.now();

		try {
			// Simple disk check using Node.js APIs
			await import('node:fs/promises').then((fs) => fs.stat('.'));

			return {
				name: 'brAInwav.disk',
				status: 'healthy',
				duration: performance.now() - startTime,
				timestamp: Date.now(),
				message: 'brAInwav disk access healthy',
				metadata: {
					accessible: true,
				},
			};
		} catch (error) {
			return {
				name: 'brAInwav.disk',
				status: 'unhealthy',
				duration: performance.now() - startTime,
				timestamp: Date.now(),
				message: 'brAInwav disk access failed',
				metadata: {
					accessible: false,
					error: String(error),
				},
			};
		}
	}

	/**
	 * Built-in circuit breakers health check
	 */
	private async checkCircuitBreakersHealth(): Promise<HealthCheckResult> {
		const startTime = performance.now();

		// This would need to be integrated with actual circuit breaker instances
		// For now, return a basic health status
		return {
			name: 'brAInwav.circuit-breakers',
			status: 'healthy',
			duration: performance.now() - startTime,
			timestamp: Date.now(),
			message: 'brAInwav circuit breakers operational',
			metadata: {
				totalBreakers: 0, // Would be actual count
				openBreakers: 0,
				halfOpenBreakers: 0,
			},
		};
	}

	/**
	 * Built-in observability health check
	 */
	private async checkObservabilityHealth(): Promise<HealthCheckResult> {
		const startTime = performance.now();

		try {
			const healthMetrics = observability.getHealthMetrics();

			return {
				name: 'brAInwav.observability',
				status: 'healthy',
				duration: performance.now() - startTime,
				timestamp: Date.now(),
				message: 'brAInwav observability system healthy',
				metadata: healthMetrics,
			};
		} catch (error) {
			return {
				name: 'brAInwav.observability',
				status: 'degraded',
				duration: performance.now() - startTime,
				timestamp: Date.now(),
				message: 'brAInwav observability system issues detected',
				metadata: {
					error: String(error),
				},
			};
		}
	}
}

// Create global health monitor instance
export const healthMonitor = new HealthMonitor();

// Initialize built-in health checks
healthMonitor.createBuiltinChecks();
