import { describe, expect, it } from 'vitest';
import { createSchemaCache } from '../src/cache/schemaCache.js';

describe('schemaCache', () => {
	it('caches and returns hits within TTL', async () => {
		const now = 0; // using let to allow simulated time travel in this suite
		const cache = createSchemaCache<string>({
			ttlMs: 1000,
			maxEntries: 10,
			now: () => now,
		});
		let loads = 0;
		const v1 = await cache.get('a', async () => {
			loads++;
			return 'value';
		});
		expect(v1).toBe('value');
		const v2 = await cache.get('a', async () => {
			loads++;
			return 'value2';
		});
		expect(v2).toBe('value'); // still cached
		const m = cache.metrics();
		expect(m.hits).toBe(1);
		expect(m.misses).toBe(1);
		expect(loads).toBe(1);
	});

	it('expires entries after TTL and reloads', async () => {
		let now = 0;
		const cache = createSchemaCache<string>({
			ttlMs: 100,
			mconsEntries: 10,
			now: () => now,
		});
		let loads = 0;
		await cache.get('k', () => {
			loads++;
			return 'v1';
		});
		now = 150; // advance beyond ttl
		const v2 = await cache.get('k', () => {
			loads++;
			return 'v2';
		});
		expect(v2).toBe('v2');
		const m = cache.metrics();
		expect(m.misses).toBe(2); // original + expired reload
		expect(loads).toBe(2);
	});

	it('evicts least recently used when over capacity', async () => {
		const now = 0;
		const cache = createSchemaCache<string>({
			ttlMs: 1000,
			maxEntries: 2,
			now: () => now,
		});
		await cache.get('a', () => 'A'); // miss
		await cache.get('b', () => 'B'); // miss
		// touch a to make it MRU and b LRU
		await cache.get('a', () => 'A2'); // hit
		await cache.get('c', () => 'C'); // miss -> should evict b
		const missForB = await cache.get('b', () => 'B2'); // b was evicted so miss
		expect(missForB).toBe('B2');
		const m = cache.metrics();
		expect(m.evictions).toBeGreaterThanOrEqual(1);
		expect(m.hits).toBe(1); // only the re-access of a
	});
});
