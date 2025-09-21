import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	BackpressureManager,
	DEFAULT_BACKPRESSURE_CONFIG,
	DEV_BACKPRESSURE_CONFIG,
	ResourceMonitor,
	Semaphore,
	withAbortableTimeout,
	withTimeout,
} from '../src/lib/backpressure';

describe('Semaphore', () => {
	it('should allow operations up to the permit limit', async () => {
		const semaphore = new Semaphore(2);

		expect(semaphore.available).toBe(2);
		expect(semaphore.queued).toBe(0);

		await semaphore.acquire();
		expect(semaphore.available).toBe(1);

		await semaphore.acquire();
		expect(semaphore.available).toBe(0);
	});

	it('should queue operations when permits are exhausted', async () => {
		const semaphore = new Semaphore(1);

		await semaphore.acquire();
		expect(semaphore.available).toBe(0);

		// This should queue since no permits available
		const acquirePromise = semaphore.acquire();
		expect(semaphore.queued).toBe(1);

		// Release permit, should resolve queued operation
		semaphore.release();
		await acquirePromise;
		expect(semaphore.queued).toBe(0);
		expect(semaphore.available).toBe(0);
	});

	it('should release permits correctly', () => {
		const semaphore = new Semaphore(2);

		// Acquire both permits
		semaphore.acquire();
		semaphore.acquire();
		expect(semaphore.available).toBe(0);

		// Release one permit
		semaphore.release();
		expect(semaphore.available).toBe(1);

		// Release another permit
		semaphore.release();
		expect(semaphore.available).toBe(2);
	});
});

describe('BackpressureManager', () => {
	let manager: BackpressureManager;

	beforeEach(() => {
		manager = new BackpressureManager(DEV_BACKPRESSURE_CONFIG);
	});

	it('should execute operations with backpressure control', async () => {
		const mockOperation = vi.fn().mockResolvedValue('success');

		const result = await manager.withBackpressure('embedder', mockOperation);

		expect(result).toBe('success');
		expect(mockOperation).toHaveBeenCalled();
	});

	it('should enforce concurrent operation limits', async () => {
		const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
		const mockOperation = vi.fn().mockImplementation(() => delay(100));

		// Start operations up to the limit
		const operations = Array(DEV_BACKPRESSURE_CONFIG.maxConcurrent.embedder)
			.fill(null)
			.map(() => manager.withBackpressure('embedder', mockOperation));

		// This should succeed (within concurrent limit)
		await Promise.all(operations);
		expect(mockOperation).toHaveBeenCalledTimes(DEV_BACKPRESSURE_CONFIG.maxConcurrent.embedder);
	});

	it('should reject when queue is full', async () => {
		const neverResolve = () => new Promise(() => {}); // Never resolves

		// Fill up concurrent slots
		Array(DEV_BACKPRESSURE_CONFIG.maxConcurrent.embedder)
			.fill(null)
			.map(() => manager.withBackpressure('embedder', neverResolve));

		// Fill up the queue
		Array(DEV_BACKPRESSURE_CONFIG.maxQueueSize.embedder)
			.fill(null)
			.map(() => manager.withBackpressure('embedder', neverResolve));

		// This should reject due to full queue
		await expect(manager.withBackpressure('embedder', neverResolve)).rejects.toThrow(
			'embedder queue full',
		);
	});

	it('should throttle when resource thresholds are exceeded', async () => {
		const adaptiveConfig = { ...DEFAULT_BACKPRESSURE_CONFIG, adaptive: true };
		const adaptiveManager = new BackpressureManager(adaptiveConfig);

		// Simulate high resource usage
		adaptiveManager.updateResourceUsage(90, 80); // Above thresholds

		const mockOperation = vi.fn().mockResolvedValue('success');

		await expect(adaptiveManager.withBackpressure('embedder', mockOperation)).rejects.toThrow(
			'embedder throttled due to high resource usage',
		);
	});

	it('should provide accurate status information', () => {
		const status = manager.getStatus();

		expect(status).toHaveLength(3); // embedder, store, reranker

		const embedderStatus = status.find((s) => s.component === 'embedder');
		expect(embedderStatus).toBeDefined();
		expect(embedderStatus?.maxConcurrent).toBe(DEV_BACKPRESSURE_CONFIG.maxConcurrent.embedder);
		expect(embedderStatus?.maxQueue).toBe(DEV_BACKPRESSURE_CONFIG.maxQueueSize.embedder);
	});
});

describe('withTimeout', () => {
	it('should resolve successfully within timeout', async () => {
		const quickOperation = () => Promise.resolve('success');

		const result = await withTimeout(quickOperation, 1000);
		expect(result).toBe('success');
	});

	it('should reject when operation times out', async () => {
		const slowOperation = () => new Promise((resolve) => setTimeout(resolve, 200));

		await expect(withTimeout(slowOperation, 100)).rejects.toThrow('Operation timed out (100ms)');
	});

	it('should use custom timeout message', async () => {
		const slowOperation = () => new Promise((resolve) => setTimeout(resolve, 200));

		await expect(withTimeout(slowOperation, 100, 'Custom timeout message')).rejects.toThrow(
			'Custom timeout message (100ms)',
		);
	});

	it('should handle operation errors correctly', async () => {
		const failingOperation = () => Promise.reject(new Error('Operation failed'));

		await expect(withTimeout(failingOperation, 1000)).rejects.toThrow('Operation failed');
	});
});

describe('withAbortableTimeout', () => {
	it('should resolve successfully within timeout', async () => {
		const quickOperation = (signal: AbortSignal) => {
			expect(signal).toBeDefined();
			return Promise.resolve('success');
		};

		const result = await withAbortableTimeout(quickOperation, 1000);
		expect(result).toBe('success');
	});

	it('should reject when operation times out', async () => {
		const slowOperation = () => new Promise((resolve) => setTimeout(resolve, 200));

		await expect(withAbortableTimeout(slowOperation, 100)).rejects.toThrow(
			'Operation timed out (100ms)',
		);
	});

	it('should provide AbortSignal to operation', async () => {
		const checkSignalOperation = (signal: AbortSignal) => {
			expect(signal).toBeInstanceOf(AbortSignal);
			expect(signal.aborted).toBe(false);
			return Promise.resolve('checked');
		};

		const result = await withAbortableTimeout(checkSignalOperation, 1000);
		expect(result).toBe('checked');
	});
});

describe('ResourceMonitor', () => {
	let monitor: ResourceMonitor;

	beforeEach(() => {
		monitor = new ResourceMonitor(100); // Short interval for testing
	});

	afterEach(() => {
		monitor.stop();
	});

	it('should start and stop monitoring', () => {
		expect(monitor.getUsage()).toEqual({ memoryPercent: 0, cpuPercent: 0 });

		monitor.start();
		// Multiple starts should be safe
		monitor.start();

		monitor.stop();
		// Multiple stops should be safe
		monitor.stop();
	});

	it('should provide usage information', () => {
		const usage = monitor.getUsage();
		expect(usage).toHaveProperty('memoryPercent');
		expect(usage).toHaveProperty('cpuPercent');
		expect(typeof usage.memoryPercent).toBe('number');
		expect(typeof usage.cpuPercent).toBe('number');
	});

	it('should update metrics periodically when started', async () => {
		monitor.start();

		// Wait for at least one update cycle
		await new Promise((resolve) => setTimeout(resolve, 150));

		const usage = monitor.getUsage();
		// Memory should be updated based on process.memoryUsage()
		expect(usage.memoryPercent).toBeGreaterThan(0);

		monitor.stop();
	});
});

describe('Configuration validation', () => {
	it('should have sensible default timeout configuration', () => {
		expect(DEFAULT_BACKPRESSURE_CONFIG.maxConcurrent.embedder).toBeGreaterThan(0);
		expect(DEFAULT_BACKPRESSURE_CONFIG.maxConcurrent.store).toBeGreaterThan(0);
		expect(DEFAULT_BACKPRESSURE_CONFIG.maxConcurrent.reranker).toBeGreaterThan(0);

		expect(DEFAULT_BACKPRESSURE_CONFIG.maxQueueSize.embedder).toBeGreaterThan(0);
		expect(DEFAULT_BACKPRESSURE_CONFIG.maxQueueSize.store).toBeGreaterThan(0);
		expect(DEFAULT_BACKPRESSURE_CONFIG.maxQueueSize.reranker).toBeGreaterThan(0);

		expect(DEFAULT_BACKPRESSURE_CONFIG.resourceThresholds.memoryPercent).toBeGreaterThan(0);
		expect(DEFAULT_BACKPRESSURE_CONFIG.resourceThresholds.memoryPercent).toBeLessThan(100);
		expect(DEFAULT_BACKPRESSURE_CONFIG.resourceThresholds.cpuPercent).toBeGreaterThan(0);
		expect(DEFAULT_BACKPRESSURE_CONFIG.resourceThresholds.cpuPercent).toBeLessThan(100);
	});

	it('should have more restrictive dev configuration', () => {
		expect(DEV_BACKPRESSURE_CONFIG.maxConcurrent.embedder).toBeLessThanOrEqual(
			DEFAULT_BACKPRESSURE_CONFIG.maxConcurrent.embedder,
		);
		expect(DEV_BACKPRESSURE_CONFIG.maxConcurrent.reranker).toBeLessThanOrEqual(
			DEFAULT_BACKPRESSURE_CONFIG.maxConcurrent.reranker,
		);
		expect(DEV_BACKPRESSURE_CONFIG.adaptive).toBe(false);
	});
});
