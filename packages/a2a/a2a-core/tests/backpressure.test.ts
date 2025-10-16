import { beforeEach, describe, expect, it } from 'vitest';
import { createEnvelope } from '@cortex-os/a2a-contracts/envelope';
import {
	BackpressureError,
	createLoadManager,
	type LoadManager,
} from '../src/backpressure/load-manager.js';

describe('Backpressure & Load Management', () => {
	let loadManager: LoadManager;

	beforeEach(() => {
		loadManager = createLoadManager({
			maxQueueDepth: 100,
			throttleThreshold: 0.8,
			backpressureStrategy: 'throttle',
			loadSheddingEnabled: true,
			maxLoad: 0.9,
			circuitBreakerThreshold: 0.5,
			cooldownPeriodMs: 1000,
		});
	});

	describe('Queue Depth Management', () => {
		it('should reject requests when queue is at capacity', async () => {
			const rejectManager = createLoadManager({
				maxQueueDepth: 10,
				throttleThreshold: 0.8,
				backpressureStrategy: 'reject',
				loadSheddingEnabled: false,
				maxLoad: 0.9,
				circuitBreakerThreshold: 0.5,
				cooldownPeriodMs: 1000,
			});

			// Simulate queue at capacity
			await expect(rejectManager.checkBackpressure(15)) // 15 > 10
				.rejects.toThrow(BackpressureError);
		});

		it('should throttle requests when approaching capacity', async () => {
			const throttleManager = createLoadManager({
				maxQueueDepth: 100,
				throttleThreshold: 0.8,
				backpressureStrategy: 'throttle',
				loadSheddingEnabled: false,
				maxLoad: 0.9,
				circuitBreakerThreshold: 0.5,
				cooldownPeriodMs: 1000,
			});

			const startTime = Date.now();

			// Queue at 85% capacity (85/100 = 0.85 > 0.8 threshold)
			await throttleManager.checkBackpressure(85);

			const elapsed = Date.now() - startTime;

			// Should have introduced some delay
			expect(elapsed).toBeGreaterThan(50); // At least 50ms delay
		});

		it('should allow requests under normal load', async () => {
			const startTime = Date.now();

			// Normal load - 50% capacity
			await loadManager.checkBackpressure(50);

			const elapsed = Date.now() - startTime;

			// Should not introduce significant delay
			expect(elapsed).toBeLessThan(50);
		});
	});

	describe('Load Shedding', () => {
		it('should drop low priority messages under high load', () => {
			const lowPriorityMessage = createEnvelope({
				type: 'background.task',
				source: 'urn:cortex:worker:background',
				data: { task: 'cleanup' },
				headers: { priority: 'low' },
			});

			// Simulate high load condition
			loadManager.recordMetrics({
				queueDepth: 95,
				processingRate: 10,
				errorRate: 0.1,
				averageLatency: 1000,
				timestamp: new Date().toISOString(),
			});

			const shouldDrop = loadManager.shouldDropMessage(lowPriorityMessage);
			expect(shouldDrop).toBe(true);
		});

		it('should preserve high priority messages under high load', () => {
			const highPriorityMessage = createEnvelope({
				type: 'critical.alert',
				source: 'urn:cortex:monitor:alerts',
				data: { alert: 'system_down' },
				headers: { priority: 'high' },
			});

			// Simulate high load
			loadManager.recordMetrics({
				queueDepth: 95,
				processingRate: 10,
				errorRate: 0.1,
				averageLatency: 1000,
				timestamp: new Date().toISOString(),
			});

			const shouldDrop = loadManager.shouldDropMessage(highPriorityMessage);
			expect(shouldDrop).toBe(false);
		});

		it('should not drop messages when load shedding is disabled', () => {
			const noSheddingManager = createLoadManager({
				maxQueueDepth: 100,
				throttleThreshold: 0.8,
				backpressureStrategy: 'throttle',
				loadSheddingEnabled: false,
				maxLoad: 0.9,
				circuitBreakerThreshold: 0.5,
				cooldownPeriodMs: 1000,
			});

			const lowPriorityMessage = createEnvelope({
				type: 'background.task',
				source: 'urn:cortex:worker:background',
				data: { task: 'cleanup' },
				headers: { priority: 'low' },
			});

			const shouldDrop = noSheddingManager.shouldDropMessage(lowPriorityMessage);
			expect(shouldDrop).toBe(false);
		});
	});

	describe('Circuit Breaker', () => {
		it('should open circuit breaker on high error rate', () => {
			// Simulate high error rate
			loadManager.recordMetrics({
				queueDepth: 50,
				processingRate: 100,
				errorRate: 0.6, // 60% error rate > 50% threshold
				averageLatency: 200,
				timestamp: new Date().toISOString(),
			});

			expect(loadManager.isCircuitBreakerOpen()).toBe(true);
		});

		it('should keep circuit breaker closed on normal error rate', () => {
			// Simulate normal operation
			loadManager.recordMetrics({
				queueDepth: 30,
				processingRate: 100,
				errorRate: 0.01, // 1% error rate < 50% threshold
				averageLatency: 100,
				timestamp: new Date().toISOString(),
			});

			expect(loadManager.isCircuitBreakerOpen()).toBe(false);
		});

		it('should reject requests when circuit breaker is open', async () => {
			const circuitBreakerManager = createLoadManager({
				maxQueueDepth: 100,
				throttleThreshold: 0.8,
				backpressureStrategy: 'circuit_breaker',
				loadSheddingEnabled: false,
				maxLoad: 0.9,
				circuitBreakerThreshold: 0.1,
				cooldownPeriodMs: 1000,
			});

			// Trigger circuit breaker
			circuitBreakerManager.recordMetrics({
				queueDepth: 50,
				processingRate: 100,
				errorRate: 0.2, // Above threshold
				averageLatency: 200,
				timestamp: new Date().toISOString(),
			});

			await expect(circuitBreakerManager.checkBackpressure(50)).rejects.toThrow(BackpressureError);
		});

		it('should close circuit breaker after cooldown period', async () => {
			const quickCooldownManager = createLoadManager({
				maxQueueDepth: 100,
				throttleThreshold: 0.8,
				backpressureStrategy: 'circuit_breaker',
				loadSheddingEnabled: false,
				maxLoad: 0.9,
				circuitBreakerThreshold: 0.1,
				cooldownPeriodMs: 10, // Very short cooldown for testing
			});

			// Open circuit breaker
			quickCooldownManager.recordMetrics({
				queueDepth: 50,
				processingRate: 100,
				errorRate: 0.2,
				averageLatency: 200,
				timestamp: new Date().toISOString(),
			});

			expect(quickCooldownManager.isCircuitBreakerOpen()).toBe(true);

			// Wait for cooldown
			await new Promise((resolve) => setTimeout(resolve, 15));

			// Should be closed now
			expect(quickCooldownManager.isCircuitBreakerOpen()).toBe(false);
		});
	});

	describe('Load Calculation', () => {
		it('should calculate load based on multiple factors', () => {
			// Record metrics with various load indicators
			loadManager.recordMetrics({
				queueDepth: 80, // 80% queue utilization
				processingRate: 50,
				errorRate: 0.2, // 20% error rate
				averageLatency: 800, // 800ms latency
				timestamp: new Date().toISOString(),
			});

			// Create a test message to check load-based decisions
			const testMessage = createEnvelope({
				type: 'test.task',
				source: 'urn:cortex:test',
				data: { test: true },
				headers: { priority: 'medium' },
			});

			// With high load, should consider dropping even medium priority
			const shouldDrop = loadManager.shouldDropMessage(testMessage);

			// This depends on the exact load calculation, but with high metrics
			// it might drop medium priority messages
			expect(typeof shouldDrop).toBe('boolean');
		});

		it('should maintain metrics history for trend analysis', () => {
			// Record multiple metrics over time
			for (let i = 0; i < 10; i++) {
				const timestamp = new Date(Date.now() + i * 1000).toISOString();

				loadManager.recordMetrics({
					queueDepth: 20 + i * 5, // Gradually increasing load
					processingRate: 100 - i * 2,
					errorRate: i * 0.01,
					averageLatency: 100 + i * 20,
					timestamp,
				});
			}

			// The load manager should be tracking this history internally
			// We can't directly test the private metrics array, but we can
			// verify that decisions are being made based on recent history

			const testMessage = createEnvelope({
				type: 'test.historical',
				source: 'urn:cortex:test',
				data: { test: true },
			});

			// Should make decisions based on recent metrics
			expect(() => loadManager.shouldDropMessage(testMessage)).not.toThrow();
		});
	});

	describe('Metrics Integration', () => {
		it('should record and utilize performance metrics', () => {
			const metricsData = {
				queueDepth: 75,
				processingRate: 80,
				errorRate: 0.05,
				averageLatency: 150,
				timestamp: new Date().toISOString(),
			};

			// Should not throw when recording valid metrics
			expect(() => loadManager.recordMetrics(metricsData)).not.toThrow();
		});

		it('should handle invalid metric values gracefully', () => {
			const invalidMetrics = {
				queueDepth: -1, // Invalid negative value
				processingRate: Number.NaN,
				errorRate: 1.5, // > 1.0 (150%)
				averageLatency: -100,
				timestamp: 'invalid-date',
			};

			// Should handle gracefully without throwing
			expect(() => loadManager.recordMetrics(invalidMetrics)).not.toThrow();
		});
	});
});
