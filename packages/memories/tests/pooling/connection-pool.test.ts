import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConnectionPool } from '../../src/pooling/connection-pool.js';
import type { MemoryStore } from '../../src/ports/MemoryStore.js';
import { createMemory, TestMemoryStore } from '../test-utils.js';

describe('Connection Pool', () => {
	let mockStoreFactory: () => Promise<MemoryStore>;
	let pool: ConnectionPool;

	beforeEach(() => {
		mockStoreFactory = vi.fn().mockImplementation(async () => {
			return new TestMemoryStore();
		});
		vi.clearAllMocks();
	});

	describe('Pool Initialization', () => {
		it('should create pool with default configuration', () => {
			// When
			pool = new ConnectionPool(mockStoreFactory);

			// Then
			const stats = pool.getStats();
			expect(stats.total).toBe(0);
			expect(stats.active).toBe(0);
			expect(stats.idle).toBe(0);
			expect(stats.pending).toBe(0);
		});

		it('should create pool with custom configuration', () => {
			// When
			pool = new ConnectionPool(mockStoreFactory, {
				maxConnections: 5,
				minConnections: 1,
				acquireTimeoutMs: 1000,
				idleTimeoutMs: 60000,
				maxLifetimeMs: 1800000,
				healthCheckIntervalMs: 30000,
			});

			// Then
			const stats = pool.getStats();
			expect(stats.total).toBe(0);
		});

		it('should initialize with minimum connections', async () => {
			// Given
			pool = new ConnectionPool(mockStoreFactory, {
				minConnections: 3,
			});

			// When
			await pool.initialize();

			// Then
			const stats = pool.getStats();
			expect(stats.total).toBe(3);
			expect(stats.idle).toBe(3);
			expect(mockStoreFactory).toHaveBeenCalledTimes(3);
		});
	});

	describe('Connection Acquisition', () => {
		beforeEach(async () => {
			pool = new ConnectionPool(mockStoreFactory, {
				minConnections: 2,
				maxConnections: 3,
			});
			await pool.initialize();
		});

		it('should acquire idle connection', async () => {
			// When
			const connection = await (pool as any).acquire();

			// Then
			expect(connection).toBeDefined();
			const stats = pool.getStats();
			expect(stats.active).toBe(1);
			expect(stats.idle).toBe(1);
			expect(stats.totalAcquired).toBe(1);
		});

		it('should create new connection when pool has capacity', async () => {
			// Given
			// Acquire all existing connections
			const conn1 = await (pool as any).acquire();
			const conn2 = await (pool as any).acquire();

			// When
			const conn3 = await (pool as any).acquire();

			// Then
			expect(conn3).toBeDefined();
			expect(conn3).not.toBe(conn1);
			expect(conn3).not.toBe(conn2);
			const stats = pool.getStats();
			expect(stats.total).toBe(3);
			expect(stats.active).toBe(3);
			expect(mockStoreFactory).toHaveBeenCalledTimes(3);
		});

		it('should wait for connection when pool is full', async () => {
			// Given
			pool = new ConnectionPool(mockStoreFactory, {
				minConnections: 1,
				maxConnections: 1,
				acquireTimeoutMs: 100,
			});
			await pool.initialize();

			// Acquire the only connection
			const conn1 = await (pool as any).acquire();

			// When
			const acquirePromise = (pool as any).acquire();

			// Release the connection after a delay
			setTimeout(() => {
				(pool as any).release(conn1);
			}, 50);

			// Then
			const conn2 = await acquirePromise;
			expect(conn2).toBe(conn1);
			const stats = pool.getStats();
			expect(stats.active).toBe(1);
		});

		it('should timeout when waiting for connection', async () => {
			// Given
			pool = new ConnectionPool(mockStoreFactory, {
				minConnections: 1,
				maxConnections: 1,
				acquireTimeoutMs: 50,
			});
			await pool.initialize();

			// Acquire the only connection
			await (pool as any).acquire();

			// When/Then
			await expect((pool as any).acquire()).rejects.toThrow('Connection acquisition timeout');
		});
	});

	describe('Connection Release', () => {
		beforeEach(async () => {
			pool = new ConnectionPool(mockStoreFactory, {
				minConnections: 2,
				maxConnections: 3,
			});
			await pool.initialize();
		});

		it('should release connection back to pool', async () => {
			// Given
			const connection = await (pool as any).acquire();
			const statsBefore = pool.getStats();

			// When
			(pool as any).release(connection);

			// Then
			const statsAfter = pool.getStats();
			expect(statsAfter.active).toBe(statsBefore.active - 1);
			expect(statsAfter.idle).toBe(statsBefore.idle + 1);
			expect(statsAfter.totalReleased).toBe(1);
		});

		it('should fulfill pending request when releasing connection', async () => {
			// Given
			pool = new ConnectionPool(mockStoreFactory, {
				minConnections: 1,
				maxConnections: 1,
			});
			await pool.initialize();

			const conn1 = await (pool as any).acquire();
			const acquirePromise = (pool as any).acquire();

			// When
			(pool as any).release(conn1);

			// Then
			const conn2 = await acquirePromise;
			expect(conn2).toBe(conn1);
			const stats = pool.getStats();
			expect(stats.active).toBe(1);
			expect(stats.pending).toBe(0);
		});
	});

	describe('MemoryStore Operations', () => {
		beforeEach(async () => {
			pool = new ConnectionPool(mockStoreFactory, {
				minConnections: 2,
			});
			await pool.initialize();
		});

		it('should perform upsert operation', async () => {
			// Given
			const memory = createMemory({ text: 'Test memory' });

			// When
			const result = await pool.upsert(memory);

			// Then
			expect(result.id).toBe(memory.id);
			expect(result.text).toBe(memory.text);
			const stats = pool.getStats();
			expect(stats.totalAcquired).toBe(1);
			expect(stats.totalReleased).toBe(1);
		});

		it('should perform get operation', async () => {
			// Given
			const memory = createMemory({ id: 'test-123', text: 'Test memory' });
			await pool.upsert(memory);

			// When
			const result = await pool.get('test-123');

			// Then
			expect(result).toEqual(memory);
		});

		it('should perform delete operation', async () => {
			// Given
			const memory = createMemory({ id: 'test-123', text: 'Test memory' });
			await pool.upsert(memory);

			// When
			await pool.delete('test-123');

			// Then
			const result = await pool.get('test-123');
			expect(result).toBeNull();
		});

		it('should perform searchByText operation', async () => {
			// Given
			await pool.upsert(createMemory({ text: 'machine learning' }));
			await pool.upsert(createMemory({ text: 'deep learning' }));

			// When
			const results = await pool.searchByText({ text: 'learning', limit: 10 });

			// Then
			expect(results).toHaveLength(2);
		});

		it('should perform searchByVector operation', async () => {
			// Given
			const memory = createMemory({
				text: 'test',
				vector: [0.1, 0.2, 0.3],
			});
			await pool.upsert(memory);

			// When
			const results = await pool.searchByVector({
				vector: [0.1, 0.2, 0.3],
				limit: 10,
			});

			// Then
			expect(results).toHaveLength(1);
		});

		it('should perform purgeExpired operation', async () => {
			// Given
			const oldMemory = createMemory({
				id: 'old',
				text: 'old memory',
				ttl: '2020-01-01T00:00:00.000Z',
			});
			await pool.upsert(oldMemory);

			// When
			const count = await pool.purgeExpired('2021-01-01T00:00:00.000Z');

			// Then
			expect(count).toBe(1);
		});
	});

	describe('Pool Statistics', () => {
		beforeEach(async () => {
			pool = new ConnectionPool(mockStoreFactory, {
				minConnections: 2,
				maxConnections: 3,
			});
			await pool.initialize();
		});

		it('should track average wait time', async () => {
			// Given
			pool = new ConnectionPool(mockStoreFactory, {
				minConnections: 1,
				maxConnections: 1,
			});
			await pool.initialize();

			// Create some wait time by having pending requests
			const conn = await (pool as any).acquire();

			// Start pending request
			const acquirePromise = (pool as any).acquire();

			// Release after delay to create wait time
			setTimeout(() => {
				(pool as any).release(conn);
			}, 20);

			// When
			await acquirePromise;
			const stats = pool.getStats();

			// Then
			expect(stats.avgWaitTimeMs).toBeGreaterThan(0);
		});

		it('should provide immutable stats object', async () => {
			// Given
			await pool.upsert(createMemory({ text: 'test' }));
			const stats1 = pool.getStats();

			// When
			await pool.upsert(createMemory({ text: 'test2' }));
			const stats2 = pool.getStats();

			// Then
			expect(stats2.totalAcquired).toBeGreaterThan(stats1.totalAcquired);
			expect(stats1).not.toBe(stats2);
		});
	});

	describe('Pool Drain', () => {
		beforeEach(async () => {
			pool = new ConnectionPool(mockStoreFactory, {
				minConnections: 2,
			});
			await pool.initialize();
		});

		it('should close all connections and stop health check', async () => {
			// When
			await pool.drain();

			// Then
			const statsAfter = pool.getStats();
			expect(statsAfter.total).toBe(0);
			expect(statsAfter.active).toBe(0);
			expect(statsAfter.idle).toBe(0);
		});

		it('should reject pending requests when draining', async () => {
			// Given
			pool = new ConnectionPool(mockStoreFactory, {
				minConnections: 1,
				maxConnections: 1,
			});
			await pool.initialize();

			// Acquire the only connection
			await (pool as any).acquire();

			// Start a pending request
			const acquirePromise = (pool as any).acquire();

			// When
			const drainPromise = pool.drain();

			// Then
			await expect(acquirePromise).rejects.toThrow('Pool is draining');
			await drainPromise;
		});
	});
});
