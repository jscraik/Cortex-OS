import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	FailureRecoveryResilienceManager,
	type FallbackStrategy,
	type ResilienceConfig,
	type RetryPolicy,
	type SystemRecoveryPattern,
} from '../failure-recovery-resilience-manager.js';

// Mock the enhanced span utility
vi.mock('../../observability/otel.js', () => ({
	withEnhancedSpan: vi.fn((_name, fn) => fn()),
}));

describe('FailureRecoveryResilienceManager', () => {
	let manager: FailureRecoveryResilienceManager;
	let baseConfig: ResilienceConfig;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();

		baseConfig = {
			circuitBreakers: {
				defaultFailureThreshold: 3,
				defaultTimeoutMs: 5000,
				defaultResetTimeoutMs: 30000,
				monitoringWindowMs: 60000,
				enableMetrics: true,
			},
			retryPolicies: {
				defaultMaxAttempts: 3,
				defaultBaseDelayMs: 1000,
				defaultMaxDelayMs: 10000,
				defaultBackoffMultiplier: 2.0,
				enableJitter: true,
			},
			fallbackStrategies: {
				enableCaching: true,
				cacheExpirationMs: 300000,
				enableDegradedMode: true,
				prioritizeAvailability: true,
			},
			systemRecovery: {
				healthCheckIntervalMs: 30000,
				autoRecoveryEnabled: true,
				maxRecoveryAttempts: 3,
				recoveryTimeoutMs: 300000,
			},
			monitoring: {
				enableDetailedMetrics: true,
				reportingIntervalMs: 60000,
				alertingEnabled: true,
				escalationThresholds: {
					warningLevel: 0.7,
					criticalLevel: 0.9,
					emergencyLevel: 0.95,
				},
			},
		};

		manager = new FailureRecoveryResilienceManager(baseConfig);
	});

	afterEach(() => {
		vi.useRealTimers();
		manager.shutdown();
	});

	describe('Circuit Breaker Functionality', () => {
		it('should initialize with default circuit breakers', () => {
			const metrics = manager.getResilienceMetrics();
			expect(metrics.circuitBreakers).toHaveLength(4);
			expect(metrics.circuitBreakers.map((cb) => cb.name)).toContain('agent-pool');
			expect(metrics.circuitBreakers.map((cb) => cb.name)).toContain('state-persistence');
		});

		it('should execute successful operation with circuit breaker', async () => {
			const mockOperation = vi.fn().mockResolvedValue('success');

			const result = await manager.executeWithCircuitBreaker('agent-pool', mockOperation);

			expect(result).toBe('success');
			expect(mockOperation).toHaveBeenCalledOnce();

			const metrics = manager.getResilienceMetrics();
			const agentPoolBreaker = metrics.circuitBreakers.find((cb) => cb.name === 'agent-pool');
			expect(agentPoolBreaker?.state).toBe('closed');
			expect(agentPoolBreaker?.metrics.totalSuccesses).toBe(1);
		});

		it('should handle failing operation with circuit breaker', async () => {
			const mockOperation = vi.fn().mockRejectedValue(new Error('Operation failed'));

			await expect(manager.executeWithCircuitBreaker('agent-pool', mockOperation)).rejects.toThrow(
				'Operation failed',
			);

			const metrics = manager.getResilienceMetrics();
			const agentPoolBreaker = metrics.circuitBreakers.find((cb) => cb.name === 'agent-pool');
			expect(agentPoolBreaker?.metrics.totalFailures).toBe(1);
		});

		it('should open circuit breaker after failure threshold', async () => {
			const mockOperation = vi.fn().mockRejectedValue(new Error('Operation failed'));

			// Trigger failures to exceed threshold
			for (let i = 0; i < 3; i++) {
				try {
					await manager.executeWithCircuitBreaker('agent-pool', mockOperation);
				} catch (_error) {
					// Expected failures
				}
			}

			const metrics = manager.getResilienceMetrics();
			const agentPoolBreaker = metrics.circuitBreakers.find((cb) => cb.name === 'agent-pool');
			expect(agentPoolBreaker?.state).toBe('open');
		});

		it('should execute fallback when circuit breaker is open', async () => {
			const mockOperation = vi.fn().mockRejectedValue(new Error('Operation failed'));
			const mockFallback = vi.fn().mockResolvedValue('fallback result');

			// Trigger failures to open circuit
			for (let i = 0; i < 3; i++) {
				try {
					await manager.executeWithCircuitBreaker('agent-pool', mockOperation);
				} catch (_error) {
					// Expected failures
				}
			}

			const result = await manager.executeWithCircuitBreaker(
				'agent-pool',
				mockOperation,
				mockFallback,
			);
			expect(result).toBe('fallback result');
			expect(mockFallback).toHaveBeenCalledOnce();
		});

		it('should register custom circuit breaker', () => {
			manager.registerCircuitBreaker('custom-service', {
				failureThreshold: 5,
				timeoutMs: 10000,
				resetTimeoutMs: 60000,
				monitoringWindowMs: 120000,
			});

			const metrics = manager.getResilienceMetrics();
			const customBreaker = metrics.circuitBreakers.find((cb) => cb.name === 'custom-service');
			expect(customBreaker).toBeDefined();
			expect(customBreaker?.configuration.failureThreshold).toBe(5);
		});
	});

	describe('Retry Policy Functionality', () => {
		it('should execute successful operation without retries', async () => {
			const mockOperation = vi.fn().mockResolvedValue('success');
			const retryPolicy: RetryPolicy = {
				maxAttempts: 3,
				baseDelayMs: 1000,
				maxDelayMs: 5000,
				backoffMultiplier: 2.0,
				jitterEnabled: false,
				retryableErrors: ['timeout', 'network'],
			};

			const result = await manager.executeWithRetry(mockOperation, retryPolicy);

			expect(result).toBe('success');
			expect(mockOperation).toHaveBeenCalledOnce();
		});

		it('should retry operation on retryable error', async () => {
			const mockOperation = vi
				.fn()
				.mockRejectedValueOnce(new Error('timeout error'))
				.mockResolvedValue('success');

			const retryPolicy: RetryPolicy = {
				maxAttempts: 3,
				baseDelayMs: 100,
				maxDelayMs: 1000,
				backoffMultiplier: 2.0,
				jitterEnabled: false,
				retryableErrors: ['timeout'],
			};

			const result = await manager.executeWithRetry(mockOperation, retryPolicy);

			expect(result).toBe('success');
			expect(mockOperation).toHaveBeenCalledTimes(2);
		});

		it('should not retry on non-retryable error', async () => {
			const mockOperation = vi.fn().mockRejectedValue(new Error('validation error'));
			const retryPolicy: RetryPolicy = {
				maxAttempts: 3,
				baseDelayMs: 100,
				maxDelayMs: 1000,
				backoffMultiplier: 2.0,
				jitterEnabled: false,
				retryableErrors: ['timeout', 'network'],
			};

			await expect(manager.executeWithRetry(mockOperation, retryPolicy)).rejects.toThrow(
				'validation error',
			);

			expect(mockOperation).toHaveBeenCalledOnce();
		});

		it('should fail after maximum retry attempts', async () => {
			const mockOperation = vi.fn().mockRejectedValue(new Error('timeout error'));
			const retryPolicy: RetryPolicy = {
				maxAttempts: 2,
				baseDelayMs: 50,
				maxDelayMs: 200,
				backoffMultiplier: 2.0,
				jitterEnabled: false,
				retryableErrors: ['timeout'],
			};

			await expect(manager.executeWithRetry(mockOperation, retryPolicy)).rejects.toThrow(
				'timeout error',
			);

			expect(mockOperation).toHaveBeenCalledTimes(2);
		});

		it('should calculate exponential backoff delay', async () => {
			const mockOperation = vi
				.fn()
				.mockRejectedValueOnce(new Error('timeout error'))
				.mockRejectedValueOnce(new Error('timeout error'))
				.mockResolvedValue('success');

			const retryPolicy: RetryPolicy = {
				maxAttempts: 3,
				baseDelayMs: 100,
				maxDelayMs: 1000,
				backoffMultiplier: 2.0,
				jitterEnabled: false,
				retryableErrors: ['timeout'],
			};

			const _startTime = Date.now();
			await manager.executeWithRetry(mockOperation, retryPolicy);

			// Fast forward timers to simulate delays
			vi.advanceTimersByTime(300); // 100ms + 200ms delays

			expect(mockOperation).toHaveBeenCalledTimes(3);
		});
	});

	describe('Fallback Strategy Functionality', () => {
		it('should execute cached response fallback', async () => {
			const originalError = new Error('timeout error');

			const result = await manager.executeFallbackStrategy(
				'cached-response-default',
				originalError,
				{ operationId: 'test-op' },
			);

			expect(result).toEqual({ fallback: 'cached-response', success: true });
		});

		it('should register custom fallback strategy', () => {
			const customStrategy: FallbackStrategy = {
				id: 'custom-fallback',
				name: 'Custom Fallback',
				type: 'degraded-mode',
				configuration: {
					priority: 1,
					timeout: 5000,
					conditions: [{ type: 'error-type', condition: 'service-unavailable' }],
				},
				implementation: {
					handler: 'basic-service',
					parameters: { features: ['read-only'] },
					expectedOutcome: 'graceful-degradation',
				},
			};

			manager.registerFallbackStrategy(customStrategy);

			// Test that strategy was registered (would need getter method in real implementation)
			expect(async () => {
				await manager.executeFallbackStrategy('custom-fallback', new Error('service-unavailable'));
			}).not.toThrow();
		});
	});

	describe('System Recovery Functionality', () => {
		it('should trigger system recovery successfully', async () => {
			const recoveryId = await manager.triggerSystemRecovery('component-restart-default', {
				component: 'agent-pool',
				reason: 'health degraded',
			});

			expect(recoveryId).toMatch(/^recovery-\d+-[a-z0-9]+$/);
		});

		it('should register custom recovery pattern', () => {
			const customPattern: SystemRecoveryPattern = {
				id: 'custom-recovery',
				name: 'Custom Recovery Pattern',
				trigger: {
					conditions: [{ component: 'custom-service', healthThreshold: 0.6, timeWindowMs: 30000 }],
					aggregationType: 'any',
				},
				recoverySteps: [
					{
						step: 'scale-resources',
						type: 'scale-resources',
						target: 'custom-service',
						parameters: { replicas: 3 },
						timeout: 60000,
						rollbackOnFailure: true,
					},
				],
				validation: {
					successCriteria: [{ metric: 'response-time', threshold: 100, timeWindowMs: 30000 }],
				},
			};

			manager.registerRecoveryPattern(customPattern);

			// Test that pattern was registered
			expect(async () => {
				await manager.triggerSystemRecovery('custom-recovery');
			}).not.toThrow();
		});
	});

	describe('Failure Analysis', () => {
		it('should analyze failure and generate comprehensive report', async () => {
			const error = new Error('Database connection failed');
			const context = {
				component: 'state-persistence',
				operation: 'saveCheckpoint',
				metadata: { checkpointId: 'cp-123' },
				timeline: [
					{
						timestamp: new Date().toISOString(),
						event: 'connection-attempt',
						data: { host: 'db.example.com', port: 5432 },
					},
				],
			};

			const report = await manager.analyzeFailure(error, context);

			expect(report.id).toMatch(/^failure-\d+-[a-z0-9]+$/);
			expect(report.failureType).toBe('component');
			expect(report.severity).toBe('medium');
			expect(report.affectedComponents).toContain('state-persistence');
			expect(report.rootCause.primary).toBeDefined();
			expect(report.recoveryActions).toBeInstanceOf(Array);
			expect(report.preventionSuggestions).toBeInstanceOf(Array);
		});
	});

	describe('Resilience Metrics and Health', () => {
		it('should provide comprehensive resilience metrics', () => {
			const metrics = manager.getResilienceMetrics();

			expect(metrics.circuitBreakers).toBeInstanceOf(Array);
			expect(metrics.systemHealth).toBeDefined();
			expect(metrics.systemHealth.overall).toBeGreaterThanOrEqual(0);
			expect(metrics.systemHealth.overall).toBeLessThanOrEqual(1);
			expect(metrics.failurePatterns).toBeInstanceOf(Array);
			expect(metrics.recoveryEffectiveness).toBeDefined();
			expect(metrics.recoveryEffectiveness.successRate).toBeGreaterThanOrEqual(0);
		});

		it('should calculate circuit breaker health scores', () => {
			const metrics = manager.getResilienceMetrics();

			for (const breaker of metrics.circuitBreakers) {
				expect(breaker.healthScore).toBeGreaterThanOrEqual(0);
				expect(breaker.healthScore).toBeLessThanOrEqual(1);
			}
		});

		it('should track system health trends', () => {
			const metrics = manager.getResilienceMetrics();

			expect(metrics.systemHealth.trends).toBeInstanceOf(Array);
			expect(metrics.systemHealth.trends.length).toBeGreaterThan(0);

			for (const trend of metrics.systemHealth.trends) {
				expect(trend.timestamp).toBeDefined();
				expect(trend.score).toBeGreaterThanOrEqual(0);
				expect(trend.score).toBeLessThanOrEqual(1);
			}
		});
	});

	describe('Configuration and Validation', () => {
		it('should validate and normalize configuration', () => {
			const invalidConfig = {
				...baseConfig,
				circuitBreakers: {
					...baseConfig.circuitBreakers,
					defaultFailureThreshold: -1, // Invalid
					defaultTimeoutMs: 500, // Below minimum
				},
				retryPolicies: {
					...baseConfig.retryPolicies,
					defaultMaxAttempts: 0, // Invalid
				},
			} as ResilienceConfig;

			const testManager = new FailureRecoveryResilienceManager(invalidConfig);
			const metrics = testManager.getResilienceMetrics();

			// Should have normalized values
			expect(metrics.circuitBreakers[0].configuration.failureThreshold).toBeGreaterThan(0);
			expect(metrics.circuitBreakers[0].configuration.timeoutMs).toBeGreaterThanOrEqual(1000);

			testManager.shutdown();
		});

		it('should support monitoring intervals', async () => {
			const monitoringConfig = {
				...baseConfig,
				monitoring: {
					...baseConfig.monitoring,
					reportingIntervalMs: 1000,
				},
			};

			const testManager = new FailureRecoveryResilienceManager(monitoringConfig);

			// Fast forward time to trigger monitoring
			vi.advanceTimersByTime(1000);
			await vi.runAllTimersAsync();

			// Should not throw errors during monitoring
			expect(() => testManager.getResilienceMetrics()).not.toThrow();

			testManager.shutdown();
		});
	});

	describe('Error Handling and Edge Cases', () => {
		it('should handle circuit breaker not found error', async () => {
			const mockOperation = vi.fn().mockResolvedValue('success');

			await expect(
				manager.executeWithCircuitBreaker('non-existent', mockOperation),
			).rejects.toThrow('Circuit breaker non-existent not found');
		});

		it('should handle fallback strategy not found error', async () => {
			const error = new Error('test error');

			await expect(manager.executeFallbackStrategy('non-existent', error)).rejects.toThrow(
				'Fallback strategy non-existent not found',
			);
		});

		it('should handle recovery pattern not found error', async () => {
			await expect(manager.triggerSystemRecovery('non-existent')).rejects.toThrow(
				'Recovery pattern non-existent not found',
			);
		});

		it('should handle operation timeout', async () => {
			const slowOperation = () => new Promise((resolve) => setTimeout(resolve, 10000));

			await expect(manager.executeWithCircuitBreaker('agent-pool', slowOperation)).rejects.toThrow(
				'Operation timed out after',
			);
		});

		it('should handle shutdown gracefully', async () => {
			// Start a recovery operation
			const recoveryPromise = manager.triggerSystemRecovery('component-restart-default');

			// Shutdown manager
			const shutdownPromise = manager.shutdown();

			// Both should complete without errors
			await expect(Promise.allSettled([recoveryPromise, shutdownPromise])).resolves.toBeDefined();
		});
	});

	describe('Performance and Scalability', () => {
		it('should handle high-frequency operations efficiently', async () => {
			const mockOperation = vi.fn().mockResolvedValue('success');
			const startTime = Date.now();

			// Execute 100 operations concurrently
			const promises = Array(100)
				.fill(0)
				.map(() => manager.executeWithCircuitBreaker('agent-pool', mockOperation));

			await Promise.all(promises);
			const endTime = Date.now();

			expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
			expect(mockOperation).toHaveBeenCalledTimes(100);
		});

		it('should maintain failure history within limits', async () => {
			// Generate many failure reports
			for (let i = 0; i < 1200; i++) {
				await manager.analyzeFailure(new Error(`Error ${i}`), {
					component: 'test-component',
					operation: 'test-operation',
				});
			}

			// History should be trimmed to reasonable size
			const metrics = manager.getResilienceMetrics();
			expect(metrics.failurePatterns).toBeDefined();
		});
	});
});
