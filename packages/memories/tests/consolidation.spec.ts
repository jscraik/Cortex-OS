import { describe, expect, it } from 'vitest';
import { InMemoryStore } from '../src/adapters/store.memory.js';
import type { Memory } from '../src/domain/types.js';
import { consolidateShortToLong } from '../src/service/consolidation.js';

describe('Consolidation', () => {
	it('promotes eligible session memories from short-term to long-term', async () => {
		const short = new InMemoryStore();
		const long = new InMemoryStore();
		const now = Date.now();

		const mk = (
			id: string,
			ageMs: number,
			scope: 'session' | 'user',
		): Memory => ({
			id,
			kind: 'note',
			text: `m ${id}`,
			tags: ['c'],
			createdAt: new Date(now - ageMs).toISOString(),
			updatedAt: new Date(now - ageMs).toISOString(),
			provenance: { source: 'system' },
			policy: { scope },
		});

		const oldSession = mk('s-old', 10_000, 'session');
		const newSession = mk('s-new', 500, 'session');
		const userMem = mk('u-keep', 20_000, 'user');
		await short.upsert(oldSession);
		await short.upsert(newSession);
		await long.upsert(userMem);

		const res = await consolidateShortToLong(short, long, { minAgeMs: 2000 });
		expect(res.promoted).toBe(1);

		expect(await short.get('s-old')).toBeNull();
		const moved = await long.get('s-old');
		expect(moved?.text).toBe('m s-old');
		expect(moved?.policy?.scope).toBe('user');

		// Not moved
		expect(await short.get('s-new')).not.toBeNull();
		expect(await long.get('s-new')).toBeNull();
		expect(await long.get('u-keep')).not.toBeNull();
	});
});
