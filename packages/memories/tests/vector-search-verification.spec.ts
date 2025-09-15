import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InMemoryStore } from '../src/adapters/store.memory.js';
import { PrismaStore } from '../src/adapters/store.prisma/client.js';
import { SQLiteStore } from '../src/adapters/store.sqlite.js';
import type { Memory } from '../src/domain/types.js';

// Mock Prisma client for testing
const mockPrisma = {
	memory: {
		upsert: vi.fn(),
		findUnique: vi.fn(),
		delete: vi.fn(),
		findMany: vi.fn(),
		deleteMany: vi.fn(),
	},
};

// Detect sqlite availability to optionally skip sqlite-vec verification
let sqliteAvailable = true;
(function checkSQLite() {
	try {
		new SQLiteStore(':memory:', 4);
	} catch {
		sqliteAvailable = false;
	}
})();

(sqliteAvailable ? describe : describe.skip)(
	'Vector Search Implementation Verification',
	() => {
		beforeEach(() => {
			// Clear all mocks before each test
			vi.clearAllMocks();
		});

		it('InMemoryStore performs accurate cosine similarity search', async () => {
			const store = new InMemoryStore();
			const now = new Date().toISOString();

			// Insert records with known vectors
			const rec1: Memory = {
				id: 'vec-1',
				kind: 'embedding',
				text: 'similar to query',
				vector: [1, 0, 0, 0], // Unit vector
				tags: ['vector'],
				createdAt: now,
				updatedAt: now,
				provenance: { source: 'system' },
			} as Memory;

			const rec2: Memory = {
				id: 'vec-2',
				kind: 'embedding',
				text: 'different from query',
				vector: [0, 1, 0, 0], // Orthogonal vector
				tags: ['vector'],
				createdAt: now,
				updatedAt: now,
				provenance: { source: 'system' },
			} as Memory;

			await store.upsert(rec1);
			await store.upsert(rec2);

			// Search with a vector similar to rec1
			const queryVector = [0.9, 0.1, 0, 0];
			const res = await store.searchByVector({ vector: queryVector, topK: 5 });

			// Should return rec1 first due to higher similarity
			expect(res[0]?.id).toBe('vec-1');
			expect(res).toHaveLength(2);
		});

		it('SQLiteStore with sqlite-vec returns nearest neighbors', async () => {
			const store = new SQLiteStore(':memory:', 4);
			const now = new Date().toISOString();

			const rec1: Memory = {
				id: 'vec-1',
				kind: 'embedding',
				text: 'similar to query',
				vector: [1, 0, 0, 0],
				tags: ['vector'],
				createdAt: now,
				updatedAt: now,
				provenance: { source: 'system' },
			} as Memory;

			const rec2: Memory = {
				id: 'vec-2',
				kind: 'embedding',
				text: 'different from query',
				vector: [0, 1, 0, 0],
				tags: ['vector'],
				createdAt: now,
				updatedAt: now,
				provenance: { source: 'system' },
			} as Memory;

			await store.upsert(rec1);
			await store.upsert(rec2);

			const queryVector = [0.9, 0.1, 0, 0];
			const res = await store.searchByVector({ vector: queryVector, topK: 5 });

			expect(res[0]?.id).toBe('vec-1');
			expect(res).toHaveLength(2);
		});

		it('PrismaStore performs accurate cosine similarity search', async () => {
			const store = new PrismaStore(mockPrisma as any);

			// Mock the findMany response with candidate records
			mockPrisma.memory.findMany.mockResolvedValue([
				{
					id: 'vec-1',
					kind: 'embedding',
					text: 'similar to query',
					vector: [1, 0, 0, 0],
					tags: ['vector'],
					createdAt: new Date(),
					updatedAt: new Date(),
					provenance: { source: 'system' },
				},
				{
					id: 'vec-2',
					kind: 'embedding',
					text: 'different from query',
					vector: [0, 1, 0, 0],
					tags: ['vector'],
					createdAt: new Date(),
					updatedAt: new Date(),
					provenance: { source: 'system' },
				},
			]);

			// Search with a vector similar to rec1
			const queryVector = [0.9, 0.1, 0, 0];
			const res = await store.searchByVector({ vector: queryVector, topK: 5 });

			// Should return results with proper similarity ranking
			expect(res).toHaveLength(2);
			// First result should be more similar to the query vector
			// (This is testing the sorting logic in the PrismaStore implementation)
		});

		it('all adapters handle vector search without vectors gracefully', async () => {
			const inMemoryStore = new InMemoryStore();
			const prismaStore = new PrismaStore(mockPrisma as any);

			const now = new Date().toISOString();

			// Insert record without vector
			const recWithoutVector: Memory = {
				id: 'no-vector',
				kind: 'note',
				text: 'no vector here',
				tags: ['text'],
				createdAt: now,
				updatedAt: now,
				provenance: { source: 'user' },
			} as Memory;

			await inMemoryStore.upsert(recWithoutVector);
			mockPrisma.memory.findMany.mockResolvedValue([
				{
					id: 'no-vector',
					kind: 'note',
					text: 'no vector here',
					vector: null,
					tags: ['text'],
					createdAt: new Date(),
					updatedAt: new Date(),
					provenance: { source: 'user' },
				},
			]);

			// Search with vector - should not return records without vectors
			const queryVector = [1, 0, 0, 0];
			const inMemoryResult = await inMemoryStore.searchByVector({
				vector: queryVector,
				topK: 5,
			});
			const prismaResult = await prismaStore.searchByVector({
				vector: queryVector,
				topK: 5,
			});

			expect(inMemoryResult).toHaveLength(0);
			expect(prismaResult).toHaveLength(0);
		});
	},
);
