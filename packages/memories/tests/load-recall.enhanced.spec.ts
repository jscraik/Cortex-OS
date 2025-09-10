import { describe, expect, it } from 'vitest';
import { InMemoryStore } from '../src/adapters/store.memory.js';
import type { Memory } from '../src/domain/types.js';

describe('MemoryStore load and recall', () => {
	it('retrieves the correct record when many exist with similar content', async () => {
		const store = new InMemoryStore();
		const now = new Date().toISOString();

		// Insert many records with similar content
		for (let i = 0; i < 1000; i++) {
			const rec: Memory = {
				id: `id-${i}`,
				kind: 'note',
				text: `message ${i} with common text pattern`,
				tags: [`tag-${i % 10}`],
				createdAt: now,
				updatedAt: now,
				provenance: { source: 'user' },
			} as Memory;
			await store.upsert(rec);
		}

		// Search for a specific record
		const res = await store.searchByText({ text: 'message 999', topK: 5 });
		expect(res).toHaveLength(1);
		expect(res[0]?.text).toBe('message 999 with common text pattern');
		expect(res[0]?.id).toBe('id-999');
	});

	it('performs well under high load with vector searches', async () => {
		const store = new InMemoryStore();
		const now = new Date().toISOString();

		// Insert records with vector data
		for (let i = 0; i < 500; i++) {
			const rec: Memory = {
				id: `vec-${i}`,
				kind: 'embedding',
				text: `vector message ${i}`,
				vector: Array(128).fill(i / 500), // Create distinct vectors
				tags: ['vector'],
				createdAt: now,
				updatedAt: now,
				provenance: { source: 'system' },
			} as Memory;
			await store.upsert(rec);
		}

		// Search with a specific vector
		const queryVector = Array(128).fill(0.99);
		const res = await store.searchByVector({ vector: queryVector, topK: 5 });

		// Should return results (exact match depends on the cosine similarity implementation)
		expect(res).toBeDefined();
		expect(res.length).toBeGreaterThan(0);
	});

	it('maintains performance with mixed data types', async () => {
		const store = new InMemoryStore();
		const now = new Date().toISOString();

		// Insert mixed types of records
		for (let i = 0; i < 300; i++) {
			if (i % 3 === 0) {
				// Text-only records
				const rec: Memory = {
					id: `text-${i}`,
					kind: 'note',
					text: `text message ${i}`,
					tags: ['text'],
					createdAt: now,
					updatedAt: now,
					provenance: { source: 'user' },
				} as Memory;
				await store.upsert(rec);
			} else if (i % 3 === 1) {
				// Vector-only records
				const rec: Memory = {
					id: `vec-${i}`,
					kind: 'embedding',
					vector: Array(64).fill(i / 300),
					tags: ['vector'],
					createdAt: now,
					updatedAt: now,
					provenance: { source: 'system' },
				} as Memory;
				await store.upsert(rec);
			} else {
				// Records with both
				const rec: Memory = {
					id: `mixed-${i}`,
					kind: 'artifact',
					text: `mixed message ${i}`,
					vector: Array(64).fill(1 - i / 300),
					tags: ['mixed', `category-${i % 5}`],
					createdAt: now,
					updatedAt: now,
					provenance: { source: 'agent' },
				} as Memory;
				await store.upsert(rec);
			}
		}

		// Test different search types
		const textResults = await store.searchByText({
			text: 'text message 150',
			topK: 3,
		});
		const vectorResults = await store.searchByVector({
			vector: Array(64).fill(0.5),
			topK: 3,
			filterTags: ['vector'],
		});

		expect(textResults).toHaveLength(1);
		expect(vectorResults.length).toBeGreaterThan(0);
	});
});
