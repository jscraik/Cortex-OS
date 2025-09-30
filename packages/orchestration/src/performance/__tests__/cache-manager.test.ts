import { describe, expect, it } from 'vitest';
import type { CacheConfig } from '../cache-manager.js';
import { CacheManager, defaultCacheConfig } from '../cache-manager.js';

describe('CacheManager', () => {
	it('sets and gets values in memory cache', async () => {
		const cfg: Partial<CacheConfig> = {
			...defaultCacheConfig,
			memory: { ...defaultCacheConfig.memory, maxSize: 10, enabled: true },
		};
		const cache = new CacheManager(cfg as CacheConfig);

		const key = 'a-key';
		await cache.set(key, { foo: 'bar' });
		const got = await cache.get<typeof key>(key);
		expect(got).toEqual({ foo: 'bar' });

		// cleanup
		cache.stopCleanupInterval();
	});

	it('evicts least-recently-used entries when capacity exceeded', async () => {
		const cfg: Partial<CacheConfig> = {
			...defaultCacheConfig,
			memory: { ...defaultCacheConfig.memory, maxSize: 2, enabled: true },
		};
		const cache = new CacheManager(cfg as CacheConfig);

		await cache.set('k1', 1);
		await cache.set('k2', 2);
		// Access k1 so k2 becomes LRU
		await cache.get('k1');
		// Add third key, should evict k2
		await cache.set('k3', 3);

		const v2 = await cache.get('k2');
		expect(v2).toBeNull();

		// cleanup
		cache.stopCleanupInterval();
	});
});
