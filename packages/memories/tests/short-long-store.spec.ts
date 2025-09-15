import { describe, expect, it } from 'vitest';
import { LayeredMemoryStore } from '../src/adapters/store.layered.js';
import { InMemoryStore } from '../src/adapters/store.memory.js';
import type { Memory } from '../src/domain/types.js';

describe('LayeredMemoryStore (short vs long-term)', () => {
	it('routes session-scoped memories to short-term and others to long-term', async () => {
		const short = new InMemoryStore();
		const long = new InMemoryStore();
		const layered = new LayeredMemoryStore(short, long);

		const now = new Date().toISOString();
		const sessionMem: Memory = {
			id: 's1',
			kind: 'note',
			text: 'ephemeral thought',
			tags: ['session'],
			createdAt: now,
			updatedAt: now,
			provenance: { source: 'user' },
			policy: { scope: 'session' },
		};
		const userMem: Memory = {
			id: 'u1',
			kind: 'note',
			text: 'long-lived note',
			tags: ['user'],
			createdAt: now,
			updatedAt: now,
			provenance: { source: 'user' },
			policy: { scope: 'user' },
		};

		await layered.upsert(sessionMem);
		await layered.upsert(userMem);

		// Present in appropriate underlying stores
		expect(await short.get('s1')).not.toBeNull();
		expect(await long.get('s1')).toBeNull();
		expect(await long.get('u1')).not.toBeNull();
		expect(await short.get('u1')).toBeNull();

		// Get from layered works across both
		expect((await layered.get('s1'))?.text).toBe('ephemeral thought');
		expect((await layered.get('u1'))?.text).toBe('long-lived note');
	});

	it('search merges results from both stores', async () => {
		const short = new InMemoryStore();
		const long = new InMemoryStore();
		const layered = new LayeredMemoryStore(short, long);

		const now = new Date().toISOString();
		await layered.upsert({
			id: 's1',
			kind: 'note',
			text: 'this is in short-term',
			tags: ['merge'],
			createdAt: now,
			updatedAt: now,
			provenance: { source: 'user' },
			policy: { scope: 'session' },
		});
		await layered.upsert({
			id: 'l1',
			kind: 'note',
			text: 'this is in long-term',
			tags: ['merge'],
			createdAt: now,
			updatedAt: now,
			provenance: { source: 'agent' },
			policy: { scope: 'user' },
		});

		const byText = await layered.searchByText({
			text: 'this',
			topK: 10,
			filterTags: ['merge'],
		});
		const ids = byText.map((m) => m.id).sort();
		expect(ids).toEqual(['l1', 's1']);
	});
});
