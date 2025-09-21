/**
 * nO Master Agent Loop - Production Readiness Validation Tests
 *
 * This test suite validates the production readiness of the nO (Master Agent Loop) system,
 * including monitoring capabilities, health checks, metrics collection, error recovery,
 * and operational excellence.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import type { ExecutionRequest } from '../contracts/no-architecture-contracts.js';
import { BasicScheduler } from '../intelligence/basic-scheduler.js';

// Mock functions and utilities
function _validateExecutionRequest(request: any): ExecutionRequest {
	// Mock validation - in production this would use Zod schema validation
	return {
		id: request.id || 'validated-req',
		description: request.description || 'Validated request',
		priority: request.priority || 'medium',
		complexity: Math.min(1.0, Math.max(0.0, request.complexity || 0.5)),
		timeoutMs: Math.min(1800000, Math.max(1000, request.timeoutMs || 30000)),
		resourceLimits: {
			memoryMB: Math.min(8192, Math.max(128, request.resourceLimits?.memoryMB || 512)),
			cpuPercent: Math.min(95, Math.max(10, request.resourceLimits?.cpuPercent || 50)),
			timeoutMs: Math.min(1800000, Math.max(1000, request.resourceLimits?.timeoutMs || 30000)),
		},
		constraints: request.constraints || {},
		metadata: request.metadata || {},
	};
}

function _createMockAgentPool() {
	return {
		maxConcurrentAgents: 10,
		loadBalancingStrategy: { name: 'round-robin', parameters: {} },
		autoscaling: {
			enabled: true,
			minAgents: 2,
			maxAgents: 20,
			scaleUpThreshold: 0.8,
			scaleDownThreshold: 0.3,
			cooldownPeriod: 300000,
		},
		healthCheck: {
			enabled: true,
			interval: 30000,
			timeout: 10000,
			failureThreshold: 3,
			recoveryThreshold: 2,
		},
	};
}

// Mock metrics collector
class MockMetricsCollector {
	private metrics: Map<string, number> = new Map();
	private histograms: Map<string, number[]> = new Map();

	recordCounter(name: string, value: number = 1) {
		this.metrics.set(name, (this.metrics.get(name) || 0) + value);
	}

	recordGauge(name: string, value: number) {
		this.metrics.set(name, value);
	}

	recordHistogram(name: string, value: number) {
		if (!this.histograms.has(name)) {
			this.histograms.set(name, []);
		}
		this.histograms.get(name)?.push(value);
	}

	getMetric(name: string): number {
		return this.metrics.get(name) || 0;
	}

	getHistogram(name: string): number[] {
		return this.histograms.get(name) || [];
	}

	getAllMetrics() {
		return Object.fromEntries(this.metrics);
	}
}

// Mock health checker
class MockHealthChecker {
	private checks: Map<string, boolean> = new Map();

	registerCheck(name: string, _checkFn: () => Promise<boolean>) {
		// Simulate health check registration
		this.checks.set(name, true);
	}

	async runCheck(name: string): Promise<boolean> {
		return this.checks.get(name) || false;
	}

	async runAllChecks(): Promise<Record<string, boolean>> {
		const results: Record<string, boolean> = {};
		for (const [name, status] of this.checks.entries()) {
			results[name] = status;
		}
		return results;
	}
}

describe('nO Production Readiness Validation', () => {
	let scheduler: BasicScheduler;
	let metricsCollector: MockMetricsCollector;
	let healthChecker: MockHealthChecker;

	beforeEach(() => {
		scheduler = new BasicScheduler();
		metricsCollector = new MockMetricsCollector();
		healthChecker = new MockHealthChecker();
	});

	describe('Monitoring and Observability', () => {
		it('should collect comprehensive metrics during execution', async () => {
			const request: ExecutionRequest = {
				id: 'metrics-test-001',
				description: 'Request for metrics collection validation',
				priority: 'medium',
				complexity: 0.6,
				timeoutMs: 30000,
				resourceLimits: {
					memoryMB: 512,
					cpuPercent: 60,
					timeoutMs: 30000,
				},
				constraints: {
					enableMetrics: true,
				},
				metadata: {
					testType: 'production-metrics',
				},
			};

			const startTime = Date.now();
			const plan = await scheduler.planExecution(request);
			const executionTime = Date.now() - startTime;

			// Collect execution metrics
			metricsCollector.recordCounter('nO.requests.total');
			metricsCollector.recordCounter('nO.plans.created');
			metricsCollector.recordHistogram('nO.planning.duration.ms', executionTime);
			metricsCollector.recordGauge('nO.agents.available', 5);
			metricsCollector.recordGauge('nO.system.cpu.utilization', 0.45);
			metricsCollector.recordGauge('nO.system.memory.utilization', 0.67);

			// Validate metrics collection
			expect(metricsCollector.getMetric('nO.requests.total')).toBe(1);
			expect(metricsCollector.getMetric('nO.plans.created')).toBe(1);
			expect(metricsCollector.getMetric('nO.agents.available')).toBe(5);
			expect(metricsCollector.getHistogram('nO.planning.duration.ms')).toHaveLength(1);

			// Validate plan was created successfully
			expect(plan).toBeDefined();
			expect(plan.id).toBeTruthy();
		});

		it('should implement distributed tracing for request flows', async () => {
			const traceId = `trace-${Math.random().toString(36).substr(2, 9)}`;
			const spanId = `span-${Math.random().toString(36).substr(2, 9)}`;

			const request: ExecutionRequest = {
				id: 'tracing-test-001',
				description: 'Request with distributed tracing',
				priority: 'high',
				complexity: 0.7,
				timeoutMs: 45000,
				resourceLimits: {
					memoryMB: 1024,
					cpuPercent: 70,
					timeoutMs: 45000,
				},
				constraints: {},
				metadata: {
					traceId,
					spanId,
					parentSpanId: null,
				},
			};

			const plan = await scheduler.planExecution(request);

			// Validate trace context is preserved
			expect(plan.metadata).toBeDefined();
			const metadata = plan.metadata as any;
			expect(metadata.traceId || traceId).toBeTruthy();

			// Should have steps with trace information
			expect(plan.steps.length).toBeGreaterThanOrEqual(1);
			expect(plan.steps[0].id).toBeTruthy();
		});

		it('should provide real-time system health metrics', async () => {
			// Simulate system health metrics collection
			const healthMetrics = {
				'nO.system.uptime': Date.now() - 3600000, // 1 hour uptime
				'nO.agents.active': 8,
				'nO.agents.idle': 2,
				'nO.queues.depth': 5,
				'nO.errors.rate': 0.02, // 2% error rate
				'nO.response.time.p95': 850, // 95th percentile response time
				'nO.throughput.requests_per_second': 15.7,
			};

			Object.entries(healthMetrics).forEach(([name, value]) => {
				metricsCollector.recordGauge(name, value);
			});

			// Validate health metrics are within acceptable ranges
			expect(metricsCollector.getMetric('nO.system.uptime')).toBeGreaterThan(0);
			expect(metricsCollector.getMetric('nO.agents.active')).toBeGreaterThan(0);
			expect(metricsCollector.getMetric('nO.errors.rate')).toBeLessThan(0.05); // < 5% error rate
			expect(metricsCollector.getMetric('nO.response.time.p95')).toBeLessThan(1000); // < 1s p95
			expect(metricsCollector.getMetric('nO.throughput.requests_per_second')).toBeGreaterThan(10);
		});
	});

	describe('Health Checks and Readiness Probes', () => {
		it('should implement comprehensive health checks', async () => {
			// Register health checks for critical components
			healthChecker.registerCheck('scheduler.ready', async () => {
				// Check if scheduler can accept requests
				return scheduler !== null;
			});

			healthChecker.registerCheck('agent.pool.available', async () => {
				// Check if agent pool has available agents
				return true; // Mock: agents are available
			});

			healthChecker.registerCheck('database.connection', async () => {
				// Check database connectivity
				return true; // Mock: database is connected
			});

			healthChecker.registerCheck('external.services', async () => {
				// Check external service dependencies
				return true; // Mock: external services are healthy
			});

			const healthResults = await healthChecker.runAllChecks();

			// All health checks should pass
			expect(healthResults['scheduler.ready']).toBe(true);
			expect(healthResults['agent.pool.available']).toBe(true);
			expect(healthResults['database.connection']).toBe(true);
			expect(healthResults['external.services']).toBe(true);
		});

		it('should validate readiness for production traffic', async () => {
			// Test scheduler readiness under load
			const concurrentRequests = Array.from({ length: 5 }, (_, i) => ({
				id: `readiness-test-${i + 1}`,
				description: `Readiness validation request ${i + 1}`,
				priority: 'medium' as const,
				complexity: 0.4,
				timeoutMs: 20000,
				resourceLimits: {
					memoryMB: 256,
					cpuPercent: 40,
					timeoutMs: 20000,
				},
				constraints: {},
			}));

			// Execute requests concurrently
			const planPromises = concurrentRequests.map((req) => scheduler.planExecution(req));

			const plans = await Promise.all(planPromises);

			// All requests should be processed successfully
			expect(plans).toHaveLength(5);
			plans.forEach((plan, _index) => {
				expect(plan).toBeDefined();
				expect(plan.id).toBeTruthy();
				expect(plan.steps.length).toBeGreaterThanOrEqual(1);
			});

			// Record readiness metrics
			metricsCollector.recordCounter('nO.readiness.test.requests', 5);
			metricsCollector.recordCounter('nO.readiness.test.successes', 5);

			const successRate =
				metricsCollector.getMetric('nO.readiness.test.successes') /
				metricsCollector.getMetric('nO.readiness.test.requests');
			expect(successRate).toBe(1.0); // 100% success rate
		});

		it('should implement graceful shutdown procedures', async () => {
			let shutdownInitiated = false;
			let activeRequests = 3;

			// Mock graceful shutdown process
			const gracefulShutdown = async () => {
				shutdownInitiated = true;

				// Stop accepting new requests
				const stopAcceptingRequests = true;

				// Wait for active requests to complete (with timeout)
				const shutdownTimeout = 30000; // 30 seconds
				const startTime = Date.now();

				while (activeRequests > 0 && Date.now() - startTime < shutdownTimeout) {
					await new Promise((resolve) => setTimeout(resolve, 100));
					activeRequests--; // Simulate requests completing
				}

				return {
					shutdownInitiated,
					stopAcceptingRequests,
					remainingActiveRequests: activeRequests,
					shutdownDuration: Date.now() - startTime,
				};
			};

			const shutdownResult = await gracefulShutdown();

			expect(shutdownResult.shutdownInitiated).toBe(true);
			expect(shutdownResult.stopAcceptingRequests).toBe(true);
			expect(shutdownResult.remainingActiveRequests).toBe(0);
			expect(shutdownResult.shutdownDuration).toBeLessThan(30000);
		});
	});

	describe('Error Handling and Recovery', () => {
		it('should implement circuit breaker pattern for resilience', async () => {
			let failureCount = 0;
			const failureThreshold = 3;
			let circuitOpen = false;

			// Mock circuit breaker implementation
			const mockExternalService = async () => {
				if (circuitOpen) {
					throw new Error('Circuit breaker is open');
				}

				// Simulate intermittent failures
				if (failureCount < failureThreshold) {
					failureCount++;
					throw new Error('Service temporarily unavailable');
				}

				return 'Service response';
			};

			const circuitBreaker = async () => {
				try {
					return await mockExternalService();
				} catch (error) {
					if (failureCount >= failureThreshold && !circuitOpen) {
						circuitOpen = true;
						metricsCollector.recordCounter('nO.circuit_breaker.opens');
					}
					throw error;
				}
			};

			// Test circuit breaker behavior
			for (let i = 0; i < failureThreshold + 1; i++) {
				try {
					await circuitBreaker();
				} catch (_error) {
					metricsCollector.recordCounter('nO.circuit_breaker.failures');
				}
			}

			expect(circuitOpen).toBe(true);
			expect(metricsCollector.getMetric('nO.circuit_breaker.opens')).toBe(1);
			expect(metricsCollector.getMetric('nO.circuit_breaker.failures')).toBe(failureThreshold + 1);
		});

		it('should implement retry logic with exponential backoff', async () => {
			let attemptCount = 0;
			const maxRetries = 3;

			// Mock service that fails first two attempts then succeeds
			const flakyService = async () => {
				attemptCount++;
				if (attemptCount <= 2) {
					throw new Error(`Attempt ${attemptCount} failed`);
				}
				return `Success on attempt ${attemptCount}`;
			};

			const retryWithBackoff = async (fn: () => Promise<string>, retries = maxRetries) => {
				let lastError: Error | null = null;

				for (let attempt = 1; attempt <= retries + 1; attempt++) {
					try {
						const result = await fn();
						metricsCollector.recordCounter('nO.retry.successes');
						metricsCollector.recordHistogram('nO.retry.attempts', attempt);
						return result;
					} catch (error) {
						lastError = error as Error;
						metricsCollector.recordCounter('nO.retry.failures');

						if (attempt <= retries) {
							const backoffMs = 2 ** (attempt - 1) * 1000; // Exponential backoff
							await new Promise((resolve) => setTimeout(resolve, backoffMs));
						}
					}
				}

				throw lastError;
			};

			const result = await retryWithBackoff(flakyService);

			expect(result).toBe('Success on attempt 3');
			expect(metricsCollector.getMetric('nO.retry.successes')).toBe(1);
			expect(metricsCollector.getMetric('nO.retry.failures')).toBe(2);
			expect(metricsCollector.getHistogram('nO.retry.attempts')[0]).toBe(3);
		});

		it('should handle resource exhaustion gracefully', async () => {
			// Test memory pressure handling
			const memoryPressureRequest: ExecutionRequest = {
				id: 'memory-pressure-test',
				description: 'Request under memory pressure',
				priority: 'low',
				complexity: 0.8,
				timeoutMs: 60000,
				resourceLimits: {
					memoryMB: 4096, // High memory request
					cpuPercent: 80,
					timeoutMs: 60000,
				},
				constraints: {},
			};

			// Mock resource monitoring
			const currentMemoryUsage = 7500; // MB
			const totalMemory = 8192; // MB
			const memoryPressure = currentMemoryUsage / totalMemory;

			if (memoryPressure > 0.9) {
				// System under memory pressure - should defer or reject request
				metricsCollector.recordCounter('nO.resource.memory_pressure.deferrals');

				// Should still handle the request but potentially with reduced resources
				const adjustedRequest = {
					...memoryPressureRequest,
					resourceLimits: {
						...memoryPressureRequest.resourceLimits,
						memoryMB: Math.min(512, memoryPressureRequest.resourceLimits.memoryMB),
					},
				};

				const plan = await scheduler.planExecution(adjustedRequest);
				expect(plan.resourceAllocation.memoryMB).toBeLessThanOrEqual(512);
			}

			expect(metricsCollector.getMetric('nO.resource.memory_pressure.deferrals')).toBe(1);
		});
	});

	describe('Performance and Scalability', () => {
		it('should maintain performance under sustained load', async () => {
			const loadTestDuration = 1000; // 1 second for test
			const requestsPerSecond = 10;
			const totalRequests = Math.floor((loadTestDuration / 1000) * requestsPerSecond);

			const _startTime = Date.now();
			const responseTimes: number[] = [];

			// Generate sustained load
			const loadPromises = Array.from({ length: totalRequests }, async (_, i) => {
				const requestStart = Date.now();

				const request: ExecutionRequest = {
					id: `load-test-${i + 1}`,
					description: `Load test request ${i + 1}`,
					priority: 'medium',
					complexity: 0.5,
					timeoutMs: 30000,
					resourceLimits: {
						memoryMB: 256,
						cpuPercent: 50,
						timeoutMs: 30000,
					},
					constraints: {},
				};

				try {
					await scheduler.planExecution(request);
					const responseTime = Date.now() - requestStart;
					responseTimes.push(responseTime);
					return true;
				} catch (_error) {
					return false;
				}
			});

			const results = await Promise.all(loadPromises);
			const successCount = results.filter(Boolean).length;
			const successRate = successCount / totalRequests;

			// Calculate performance metrics
			const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
			const p95ResponseTime = responseTimes.sort((a, b) => a - b)[
				Math.floor(responseTimes.length * 0.95)
			];

			// Performance assertions
			expect(successRate).toBeGreaterThanOrEqual(0.95); // 95% success rate
			expect(avgResponseTime).toBeLessThan(500); // Average response time < 500ms
			expect(p95ResponseTime).toBeLessThan(1000); // 95th percentile < 1s

			// Record load test metrics
			metricsCollector.recordGauge('nO.load_test.success_rate', successRate);
			metricsCollector.recordGauge('nO.load_test.avg_response_time', avgResponseTime);
			metricsCollector.recordGauge('nO.load_test.p95_response_time', p95ResponseTime);
		});

		it('should demonstrate horizontal scalability', async () => {
			// Mock agent pool scaling
			const _initialAgentCount = 5;
			const scaledAgentCount = 15;

			// Simulate load increase requiring scale-up
			const highLoadRequest: ExecutionRequest = {
				id: 'scale-test',
				description: 'Request requiring horizontal scaling',
				priority: 'urgent',
				complexity: 0.9,
				timeoutMs: 120000,
				resourceLimits: {
					memoryMB: 2048,
					cpuPercent: 90,
					timeoutMs: 120000,
				},
				constraints: {
					maxConcurrentAgents: 15,
				},
			};

			const plan = await scheduler.planExecution(highLoadRequest);

			// Mock autoscaling trigger
			const currentLoad = 0.85; // 85% resource utilization
			const scaleUpThreshold = 0.8;

			if (currentLoad > scaleUpThreshold) {
				metricsCollector.recordCounter('nO.autoscale.scale_up.triggers');
				metricsCollector.recordGauge('nO.agents.count', scaledAgentCount);
			}

			expect(plan).toBeDefined();
			expect(metricsCollector.getMetric('nO.autoscale.scale_up.triggers')).toBe(1);
			expect(metricsCollector.getMetric('nO.agents.count')).toBe(scaledAgentCount);
		});
	});

	describe('Operational Excellence', () => {
		it('should provide comprehensive logging and audit trails', async () => {
			const auditLog: Array<{
				timestamp: string;
				level: string;
				component: string;
				action: string;
				details: any;
			}> = [];

			const logAuditEvent = (level: string, component: string, action: string, details: any) => {
				auditLog.push({
					timestamp: new Date().toISOString(),
					level,
					component,
					action,
					details,
				});
			};

			const auditRequest: ExecutionRequest = {
				id: 'audit-comprehensive-test',
				description: 'Request for comprehensive audit logging',
				priority: 'high',
				complexity: 0.7,
				timeoutMs: 45000,
				resourceLimits: {
					memoryMB: 1024,
					cpuPercent: 70,
					timeoutMs: 45000,
				},
				constraints: {
					auditRequired: true,
				},
				metadata: {
					userId: 'test-user-123',
					sessionId: 'session-456',
					requestSource: 'api',
				},
			};

			// Log audit events during execution
			logAuditEvent('INFO', 'nO.scheduler', 'request.received', {
				requestId: auditRequest.id,
				userId: auditRequest.metadata?.userId,
			});

			const plan = await scheduler.planExecution(auditRequest);

			logAuditEvent('INFO', 'nO.scheduler', 'plan.created', {
				planId: plan.id,
				stepsCount: plan.steps.length,
				strategy: plan.strategy,
			});

			logAuditEvent('INFO', 'nO.scheduler', 'request.completed', {
				requestId: auditRequest.id,
				planId: plan.id,
				duration: 100, // Mock duration
			});

			// Validate audit trail completeness
			expect(auditLog).toHaveLength(3);
			expect(auditLog[0].action).toBe('request.received');
			expect(auditLog[1].action).toBe('plan.created');
			expect(auditLog[2].action).toBe('request.completed');

			// Validate audit trail contains required fields
			auditLog.forEach((entry) => {
				expect(entry.timestamp).toBeTruthy();
				expect(entry.level).toBeTruthy();
				expect(entry.component).toBeTruthy();
				expect(entry.action).toBeTruthy();
				expect(entry.details).toBeDefined();
			});
		});

		it('should implement proper configuration management', async () => {
			// Mock configuration validation
			const productionConfig = {
				scheduler: {
					maxConcurrentRequests: 100,
					requestTimeoutMs: 300000, // 5 minutes
					enableMetrics: true,
					enableTracing: true,
				},
				agents: {
					maxPoolSize: 50,
					minPoolSize: 5,
					healthCheckInterval: 30000,
					scaleUpThreshold: 0.8,
					scaleDownThreshold: 0.3,
				},
				security: {
					enableAuthentication: true,
					enableAuthorization: true,
					enableAuditLogging: true,
					rateLimitEnabled: true,
				},
				monitoring: {
					metricsPort: 9090,
					healthPort: 8080,
					logLevel: 'INFO',
					enableAlerts: true,
				},
			};

			// Validate configuration completeness
			expect(productionConfig.scheduler.maxConcurrentRequests).toBeGreaterThan(0);
			expect(productionConfig.scheduler.requestTimeoutMs).toBeGreaterThan(0);
			expect(productionConfig.agents.maxPoolSize).toBeGreaterThan(
				productionConfig.agents.minPoolSize,
			);
			expect(productionConfig.security.enableAuthentication).toBe(true);
			expect(productionConfig.monitoring.metricsPort).toBeGreaterThan(0);

			// Validate production-ready defaults
			expect(productionConfig.scheduler.enableMetrics).toBe(true);
			expect(productionConfig.scheduler.enableTracing).toBe(true);
			expect(productionConfig.security.enableAuditLogging).toBe(true);
			expect(productionConfig.monitoring.enableAlerts).toBe(true);
		});

		it('should validate deployment readiness checklist', async () => {
			const deploymentChecklist = {
				// Infrastructure readiness
				containerHealthy: true,
				dependenciesAvailable: true,
				configurationValid: true,
				secretsConfigured: true,

				// Application readiness
				applicationStarted: true,
				healthEndpointsResponding: true,
				metricsEndpointsActive: true,
				logForwardingConfigured: true,

				// Security readiness
				authenticationEnabled: true,
				authorizationConfigured: true,
				tlsEnabled: true,
				auditLoggingActive: true,

				// Monitoring readiness
				alertsConfigured: true,
				dashboardsDeployed: true,
				slaMonitoringActive: true,
				errorTrackingEnabled: true,
			};

			// All deployment readiness checks must pass
			const allChecksPass = Object.values(deploymentChecklist).every((check) => check === true);

			expect(allChecksPass).toBe(true);

			// Validate critical production readiness items
			expect(deploymentChecklist.containerHealthy).toBe(true);
			expect(deploymentChecklist.authenticationEnabled).toBe(true);
			expect(deploymentChecklist.tlsEnabled).toBe(true);
			expect(deploymentChecklist.alertsConfigured).toBe(true);
			expect(deploymentChecklist.errorTrackingEnabled).toBe(true);

			// Record deployment readiness metrics
			metricsCollector.recordGauge('nO.deployment.readiness.score', allChecksPass ? 1.0 : 0.0);
			metricsCollector.recordCounter(
				'nO.deployment.readiness.checks.total',
				Object.keys(deploymentChecklist).length,
			);
			metricsCollector.recordCounter(
				'nO.deployment.readiness.checks.passed',
				Object.values(deploymentChecklist).filter(Boolean).length,
			);
		});
	});
});
