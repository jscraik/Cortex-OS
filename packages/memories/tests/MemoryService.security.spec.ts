import { describe, it, expect, vi } from 'vitest';
import { MemoryService } from '../src/MemoryService';
import { IQdrant } from '../src/adapters/qdrant';
import { INeo4j } from '../src/adapters/neo4j';
import { TenantCtx, MemoryRecord, VectorQuery, VectorHit } from '../src/types';

// Mocks
const mockQdrant: IQdrant = {
  ensureCollection: vi.fn(),
  upsert: vi.fn(),
  search: vi.fn(),
  deleteExpired: vi.fn(),
};

const mockNeo4j: INeo4j = {
  upsertNode: vi.fn(),
  upsertRel: vi.fn(),
  neighborhood: vi.fn(),
};

const mockEmbedder = {
  embed: vi.fn().mockResolvedValue([[0.1, 0.2, 0.3]]),
};

describe('MemoryService Security', () => {
  it('should filter search results based on read policy', async () => {
    const memoryService = new MemoryService(mockQdrant, mockNeo4j, mockEmbedder, 3);

    const ownerCtx: TenantCtx = { tenantId: 'test-tenant', userId: 'user-A' };
    const otherUserCtx: TenantCtx = { tenantId: 'test-tenant', userId: 'user-B' };

    const restrictedRecord: MemoryRecord = {
      id: 'doc-1',
      tenantId: 'test-tenant',
      kind: 'test',
      text: 'This is a restricted document.',
      embedding: [0.1, 0.2, 0.3],
      createdAt: new Date().toISOString(),
      policy: {
        canRead: ['user-A'],
        canWrite: ['user-A'],
      },
    };
    
    // Mock the qdrant search to return the restricted record
    (mockQdrant.search as vi.Mock).mockResolvedValue([
        {
            id: restrictedRecord.id,
            payload: restrictedRecord,
            score: 0.99,
        } as VectorHit
    ]);

    const query: Omit<VectorQuery, 'tenantId'> = {
        embedding: [0.1, 0.2, 0.3],
        topK: 1,
    };

    // When the owner searches, they should get the document
    const searchResultForOwner = await memoryService.search(ownerCtx, query);
    expect(searchResultForOwner).toHaveLength(1);
    expect(searchResultForOwner[0].id).toBe(restrictedRecord.id);

    // When the other user searches, they should get an empty array
    const searchResultForOtherUser = await memoryService.search(otherUserCtx, query);
    expect(searchResultForOtherUser).toBeInstanceOf(Array);
    expect(searchResultForOtherUser).toHaveLength(0);
  });
});
