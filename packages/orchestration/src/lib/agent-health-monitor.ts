/**
 * Proactive Agent Health Monitoring System
 * Monitors agent health, performance, and availability
 */

import { EventEmitter } from 'node:events';

export interface AgentHealthMetrics {
	agentId: string;
	responseTime: number;
	successRate: number;
	errorRate: number;
	lastSeen: Date;
	consecutiveFailures: number;
	totalRequests: number;
	totalFailures: number;
	averageResponseTime: number;
	uptime: number;
	memoryUsage?: number;
	cpuUtilization?: number;
}

export interface AgentHealthThresholds {
	maxResponseTime: number;
	minSuccessRate: number;
	maxErrorRate: number;
	maxConsecutiveFailures: number;
	maxTimeSinceLastSeen: number;
	minUptime: number;
}

export interface AgentHealthStatus {
	agentId: string;
	status: 'healthy' | 'degraded' | 'unhealthy' | 'offline';
	score: number; // 0-100
	issues: string[];
	lastChecked: Date;
	metrics: AgentHealthMetrics;
	thresholds: AgentHealthThresholds;
}

export interface HealthCheckResult {
	agentId: string;
	success: boolean;
	responseTime: number;
	error?: Error;
	timestamp: Date;
}

/**
 * Agent Health Monitor for proactive health management
 */
export class AgentHealthMonitor extends EventEmitter {
	private healthMetrics = new Map<string, AgentHealthMetrics>();
	private healthStatus = new Map<string, AgentHealthStatus>();
	private healthCheckInterval?: NodeJS.Timeout;
	private cleanupInterval?: NodeJS.Timeout;

	private defaultThresholds: AgentHealthThresholds = {
		maxResponseTime: 10000, // 10 seconds
		minSuccessRate: 0.8, // 80%
		maxErrorRate: 0.2, // 20%
		maxConsecutiveFailures: 3,
		maxTimeSinceLastSeen: 60000, // 1 minute
		minUptime: 0.95, // 95%
	};

	constructor(
		private options: {
			healthCheckIntervalMs: number;
			cleanupIntervalMs: number;
			enableProactiveChecks: boolean;
			defaultThresholds?: Partial<AgentHealthThresholds>;
		} = {
			healthCheckIntervalMs: 30000, // 30 seconds
			cleanupIntervalMs: 300000, // 5 minutes
			enableProactiveChecks: true,
		},
	) {
		super();

		if (options.defaultThresholds) {
			this.defaultThresholds = {
				...this.defaultThresholds,
				...options.defaultThresholds,
			};
		}
	}

	/**
	 * Start health monitoring
	 */
	startMonitoring(): void {
		if (this.healthCheckInterval) {
			return; // Already started
		}

		this.healthCheckInterval = setInterval(async () => {
			try {
				await this.performHealthChecks();
			} catch (error) {
				this.emit('monitoringError', { error, timestamp: new Date() });
			}
		}, this.options.healthCheckIntervalMs);

		this.cleanupInterval = setInterval(() => {
			this.cleanupStaleAgents();
		}, this.options.cleanupIntervalMs);

		this.emit('monitoringStarted', { timestamp: new Date() });
	}

	/**
	 * Stop health monitoring
	 */
	stopMonitoring(): void {
		if (this.healthCheckInterval) {
			clearInterval(this.healthCheckInterval);
			this.healthCheckInterval = undefined;
		}

		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
			this.cleanupInterval = undefined;
		}

		this.emit('monitoringStopped', { timestamp: new Date() });
	}

	/**
	 * Register an agent for monitoring
	 */
	registerAgent(
		agentId: string,
		capabilities: string[],
		thresholds?: Partial<AgentHealthThresholds>,
	): void {
		const now = new Date();

		const metrics: AgentHealthMetrics = {
			agentId,
			responseTime: 0,
			successRate: 1.0,
			errorRate: 0.0,
			lastSeen: now,
			consecutiveFailures: 0,
			totalRequests: 0,
			totalFailures: 0,
			averageResponseTime: 0,
			uptime: 1.0,
		};

		const status: AgentHealthStatus = {
			agentId,
			status: 'healthy',
			score: 100,
			issues: [],
			lastChecked: now,
			metrics,
			thresholds: { ...this.defaultThresholds, ...thresholds },
		};

		this.healthMetrics.set(agentId, metrics);
		this.healthStatus.set(agentId, status);

		this.emit('agentRegistered', { agentId, capabilities, timestamp: now });
	}

	/**
	 * Unregister an agent from monitoring
	 */
	unregisterAgent(agentId: string): void {
		this.healthMetrics.delete(agentId);
		this.healthStatus.delete(agentId);

		this.emit('agentUnregistered', { agentId, timestamp: new Date() });
	}

	/**
	 * Record agent activity (success/failure)
	 */
	recordAgentActivity(
		agentId: string,
		result: {
			success: boolean;
			responseTime: number;
			error?: Error;
		},
	): void {
		const metrics = this.healthMetrics.get(agentId);
		if (!metrics) {
			return; // Agent not registered
		}

		const now = new Date();
		metrics.lastSeen = now;
		metrics.totalRequests++;

		// Update response time (moving average)
		metrics.responseTime = result.responseTime;
		metrics.averageResponseTime =
			(metrics.averageResponseTime * (metrics.totalRequests - 1) +
				result.responseTime) /
			metrics.totalRequests;

		if (result.success) {
			metrics.consecutiveFailures = 0;
		} else {
			metrics.totalFailures++;
			metrics.consecutiveFailures++;
		}

		// Recalculate rates
		metrics.successRate =
			(metrics.totalRequests - metrics.totalFailures) / metrics.totalRequests;
		metrics.errorRate = metrics.totalFailures / metrics.totalRequests;

		// Update health status
		this.updateAgentHealthStatus(agentId);

		this.emit('activityRecorded', {
			agentId,
			success: result.success,
			responseTime: result.responseTime,
			error: result.error,
			timestamp: now,
		});
	}

	/**
	 * Perform health checks on all registered agents
	 */
	private async performHealthChecks(): Promise<void> {
		const healthCheckPromises: Promise<void>[] = [];

		for (const [agentId] of this.healthMetrics) {
			if (this.options.enableProactiveChecks) {
				healthCheckPromises.push(this.performAgentHealthCheck(agentId));
			} else {
				// Just update status based on existing metrics
				this.updateAgentHealthStatus(agentId);
			}
		}

		await Promise.allSettled(healthCheckPromises);

		this.emit('healthCheckCompleted', {
			agentCount: this.healthMetrics.size,
			timestamp: new Date(),
		});
	}

	/**
	 * Perform health check on a specific agent
	 */
	private async performAgentHealthCheck(agentId: string): Promise<void> {
		const metrics = this.healthMetrics.get(agentId);
		if (!metrics) return;

		const startTime = Date.now();

		try {
			// Perform actual health check (ping/status check)
			const healthCheckResult = await this.pingAgent(agentId);
			const responseTime = Date.now() - startTime;

			this.recordAgentActivity(agentId, {
				success: healthCheckResult.success,
				responseTime,
				error: healthCheckResult.error,
			});

			if (!healthCheckResult.success && healthCheckResult.error) {
				this.emit('agentHealthCheckFailed', {
					agentId,
					error: healthCheckResult.error,
					responseTime,
					timestamp: new Date(),
				});
			}
		} catch (error) {
			const responseTime = Date.now() - startTime;

			this.recordAgentActivity(agentId, {
				success: false,
				responseTime,
				error: error as Error,
			});

			this.emit('agentHealthCheckError', {
				agentId,
				error,
				responseTime,
				timestamp: new Date(),
			});
		}
	}

	/**
	 * Ping an agent to check if it's responsive
	 */
	private async pingAgent(agentId: string): Promise<HealthCheckResult> {
		const timestamp = new Date();
		const startTime = Date.now();

		try {
			// Implement actual ping logic here
			// This is a placeholder that simulates a health check
			await new Promise((resolve) => setTimeout(resolve, Math.random() * 100));

			const responseTime = Date.now() - startTime;

			// Simulate occasional failures for testing
			const success = Math.random() > 0.05; // 5% failure rate

			return {
				agentId,
				success,
				responseTime,
				error: success ? undefined : new Error('Agent ping failed'),
				timestamp,
			};
		} catch (error) {
			return {
				agentId,
				success: false,
				responseTime: Date.now() - startTime,
				error: error as Error,
				timestamp,
			};
		}
	}

	/**
	 * Update health status for an agent based on current metrics
	 */
	private updateAgentHealthStatus(agentId: string): void {
		const metrics = this.healthMetrics.get(agentId);
		const status = this.healthStatus.get(agentId);

		if (!metrics || !status) return;

		const now = new Date();
		const timeSinceLastSeen = now.getTime() - metrics.lastSeen.getTime();

		// Calculate health score (0-100)
		let score = 100;
		const issues: string[] = [];

		// Check response time
		if (metrics.responseTime > status.thresholds.maxResponseTime) {
			const penalty = Math.min(
				30,
				(metrics.responseTime / status.thresholds.maxResponseTime) * 10,
			);
			score -= penalty;
			issues.push(`High response time: ${metrics.responseTime}ms`);
		}

		// Check success rate
		if (metrics.successRate < status.thresholds.minSuccessRate) {
			const penalty =
				(status.thresholds.minSuccessRate - metrics.successRate) * 100;
			score -= penalty;
			issues.push(
				`Low success rate: ${(metrics.successRate * 100).toFixed(1)}%`,
			);
		}

		// Check consecutive failures
		if (
			metrics.consecutiveFailures >= status.thresholds.maxConsecutiveFailures
		) {
			score -= 20;
			issues.push(`${metrics.consecutiveFailures} consecutive failures`);
		}

		// Check if agent is offline
		if (timeSinceLastSeen > status.thresholds.maxTimeSinceLastSeen) {
			score -= 40;
			issues.push(`Offline for ${Math.round(timeSinceLastSeen / 1000)}s`);
		}

		// Determine status based on score
		let healthStatus: AgentHealthStatus['status'];
		if (score >= 80) {
			healthStatus = 'healthy';
		} else if (score >= 60) {
			healthStatus = 'degraded';
		} else if (score >= 20) {
			healthStatus = 'unhealthy';
		} else {
			healthStatus = 'offline';
		}

		// Update status
		const previousStatus = status.status;
		status.status = healthStatus;
		status.score = Math.max(0, score);
		status.issues = issues;
		status.lastChecked = now;

		// Emit events for status changes
		if (previousStatus !== healthStatus) {
			this.emit('agentStatusChanged', {
				agentId,
				previousStatus,
				newStatus: healthStatus,
				score: status.score,
				issues,
				timestamp: now,
			});

			if (healthStatus === 'unhealthy' || healthStatus === 'offline') {
				this.emit('agentUnhealthy', {
					agentId,
					status: healthStatus,
					score: status.score,
					issues,
					metrics,
					timestamp: now,
				});
			} else if (
				previousStatus === 'unhealthy' ||
				previousStatus === 'offline'
			) {
				this.emit('agentRecovered', {
					agentId,
					previousStatus,
					newStatus: healthStatus,
					score: status.score,
					timestamp: now,
				});
			}
		}
	}

	/**
	 * Get health status for all agents
	 */
	getAgentHealthStatuses(): AgentHealthStatus[] {
		return Array.from(this.healthStatus.values());
	}

	/**
	 * Get health status for a specific agent
	 */
	getAgentHealthStatus(agentId: string): AgentHealthStatus | null {
		return this.healthStatus.get(agentId) || null;
	}

	/**
	 * Get health metrics for a specific agent
	 */
	getAgentMetrics(agentId: string): AgentHealthMetrics | null {
		return this.healthMetrics.get(agentId) || null;
	}

	/**
	 * Check if an agent is healthy
	 */
	isAgentHealthy(agentId: string): boolean {
		const status = this.healthStatus.get(agentId);
		return status ? status.status === 'healthy' : false;
	}

	/**
	 * Get list of unhealthy agents
	 */
	getUnhealthyAgents(): AgentHealthStatus[] {
		return Array.from(this.healthStatus.values()).filter(
			(status) => status.status === 'unhealthy' || status.status === 'offline',
		);
	}

	/**
	 * Get overall system health summary
	 */
	getSystemHealthSummary(): {
		totalAgents: number;
		healthy: number;
		degraded: number;
		unhealthy: number;
		offline: number;
		averageScore: number;
		systemStatus: 'healthy' | 'degraded' | 'unhealthy';
	} {
		const statuses = this.getAgentHealthStatuses();
		const totalAgents = statuses.length;

		let healthy = 0;
		let degraded = 0;
		let unhealthy = 0;
		let offline = 0;
		let totalScore = 0;

		for (const status of statuses) {
			totalScore += status.score;
			switch (status.status) {
				case 'healthy':
					healthy++;
					break;
				case 'degraded':
					degraded++;
					break;
				case 'unhealthy':
					unhealthy++;
					break;
				case 'offline':
					offline++;
					break;
			}
		}

		const averageScore = totalAgents > 0 ? totalScore / totalAgents : 100;

		let systemStatus: 'healthy' | 'degraded' | 'unhealthy';
		if (averageScore >= 80 && unhealthy === 0 && offline === 0) {
			systemStatus = 'healthy';
		} else if (averageScore >= 60) {
			systemStatus = 'degraded';
		} else {
			systemStatus = 'unhealthy';
		}

		return {
			totalAgents,
			healthy,
			degraded,
			unhealthy,
			offline,
			averageScore,
			systemStatus,
		};
	}

	/**
	 * Clean up agents that haven't been seen for a long time
	 */
	private cleanupStaleAgents(): void {
		const now = new Date();
		const staleThreshold = this.options.cleanupIntervalMs * 3; // 3x cleanup interval

		for (const [agentId, metrics] of this.healthMetrics) {
			const timeSinceLastSeen = now.getTime() - metrics.lastSeen.getTime();

			if (timeSinceLastSeen > staleThreshold) {
				this.unregisterAgent(agentId);
				this.emit('staleAgentRemoved', {
					agentId,
					timeSinceLastSeen,
					timestamp: now,
				});
			}
		}
	}

	/**
	 * Update resource usage metrics for an agent
	 */
	updateAgentResources(
		agentId: string,
		resources: {
			memoryUsage?: number;
			cpuUtilization?: number;
		},
	): void {
		const metrics = this.healthMetrics.get(agentId);
		if (metrics) {
			metrics.memoryUsage = resources.memoryUsage;
			metrics.cpuUtilization = resources.cpuUtilization;
			this.updateAgentHealthStatus(agentId);
		}
	}
}

// Global health monitor instance
let globalHealthMonitor: AgentHealthMonitor | null = null;

/**
 * Get or create global health monitor instance
 */
export function getGlobalHealthMonitor(): AgentHealthMonitor {
	if (!globalHealthMonitor) {
		globalHealthMonitor = new AgentHealthMonitor();
	}
	return globalHealthMonitor;
}
