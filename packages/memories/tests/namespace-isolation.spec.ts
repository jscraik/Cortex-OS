import { describe, expect, it } from 'vitest';
import { InMemoryStore } from '../src/adapters/store.memory.js';
import type { Memory } from '../src/domain/types.js';

describe('InMemoryStore namespace isolation', () => {
	it('isolates CRUD operations per namespace', async () => {
		const store = new InMemoryStore();
		const now = new Date().toISOString();
		const base: Omit<Memory, 'id'> = {
			kind: 'note',
			text: 'a',
			tags: [],
			createdAt: now,
			updatedAt: now,
			provenance: { source: 'user' },
		};
		await store.upsert({ ...base, id: '1' }, 'ns1');
		await store.upsert({ ...base, id: '1', text: 'b' }, 'ns2');

		expect((await store.get('1', 'ns1'))?.text).toBe('a');
		expect((await store.get('1', 'ns2'))?.text).toBe('b');

		const r1 = await store.searchByText({ text: 'a', topK: 5 }, 'ns1');
		const r2 = await store.searchByText({ text: 'b', topK: 5 }, 'ns2');
		expect(r1.map((m) => m.id)).toEqual(['1']);
		expect(r2.map((m) => m.id)).toEqual(['1']);

		await store.delete('1', 'ns1');
		expect(await store.get('1', 'ns1')).toBeNull();
		expect(await store.get('1', 'ns2')).not.toBeNull();
	});
});
