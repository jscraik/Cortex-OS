import { describe, expect, it } from 'vitest';
import { createQuotaStore, InMemoryQuotaStore } from '../src/quota/QuotaStore';

describe('QuotaStore (InMemory)', () => {
	it('increments global until limit then returns limit', async () => {
		const store = new InMemoryQuotaStore();
		const windowMs = 200;
		const limit = 2;
		expect(await store.incrGlobal(windowMs, limit)).toBe('ok');
		expect(await store.incrGlobal(windowMs, limit)).toBe('ok');
		expect(await store.incrGlobal(windowMs, limit)).toBe('limit');
	});

	it('resets after window', async () => {
		const store = new InMemoryQuotaStore();
		const windowMs = 30;
		const limit = 1;
		expect(await store.incrGlobal(windowMs, limit)).toBe('ok');
		expect(await store.incrGlobal(windowMs, limit)).toBe('limit');
		await new Promise((r) => setTimeout(r, windowMs + 5));
		expect(await store.incrGlobal(windowMs, limit)).toBe('ok');
	});

	it('per-key respects both global and per-key limits', async () => {
		const store = new InMemoryQuotaStore();
		const windowMs = 100;
		const perLimit = 2;
		const global = { windowMs, limit: 3 };
		expect(await store.incrPerKey('a', windowMs, perLimit, global)).toBe('ok'); // a:1 g:1
		expect(await store.incrPerKey('b', windowMs, perLimit, global)).toBe('ok'); // b:1 g:2
		expect(await store.incrPerKey('a', windowMs, perLimit, global)).toBe('ok'); // a:2 g:3
		// global hit
		expect(await store.incrPerKey('c', windowMs, perLimit, global)).toBe('global');
		// per-key hit
		expect(await store.incrPerKey('a', windowMs, perLimit, { windowMs, limit: 100 })).toBe('limit');
	});
});

describe('QuotaStore dynamic (no redis)', () => {
	it('falls back to in-memory when REDIS_URL undefined', async () => {
		delete process.env.REDIS_URL;
		const store = await createQuotaStore();
		expect(store).toBeInstanceOf(InMemoryQuotaStore);
	});
});
