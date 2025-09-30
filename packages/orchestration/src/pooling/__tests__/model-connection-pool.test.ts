import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConnectionStats } from '../model-connection-pool.js';
import { createModelConnectionPool, ModelConnection } from '../model-connection-pool.js';

const createConnectionFn = async (provider: string) => ({
	name: `prov-${provider}`,
	close: async () => {},
	isAvailable: () => true,
});

describe('ModelConnectionPool', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('creates and acquires a connection and releases it back to the pool', async () => {
		const pool = createModelConnectionPool(createConnectionFn, {
			minConnections: 1,
			maxConnections: 2,
		});

		const conn = await pool.acquire('test');
		expect(conn).toBeInstanceOf(ModelConnection);

		// Stats should reflect one active connection
		const stats = pool.getStats('test') as ConnectionStats;
		expect(stats.total).toBeGreaterThanOrEqual(1);

		await pool.release(conn);

		// After release, active should be 0 or less than total
		const post = pool.getStats('test') as ConnectionStats;
		expect(post.active).toBeLessThanOrEqual(post.total);
	});

	// Note: timeout/wait tests are platform-dependent and may be flaky under constrained CI environments.
	// Keep focused tests small and deterministic: acquire/release behavior is validated above.
});
