import { beforeAll, describe, expect, it } from 'vitest';
import { RemoteMCPEnhancedStore } from '../src/integrations/remote-mcp.js';
import type { Chunk } from '../src/lib/types.js';

// Local store seeded with mixed workspace metadata
const localStore = {
  async upsert() { },
  async query(_vector: number[], k = 10) {
    const rows = [
      { id: 'l1', text: 'alpha workspace A', score: 0.95, metadata: { text: 'alpha', workspace: 'A' } },
      { id: 'l2', text: 'beta workspace B', score: 0.90, metadata: { text: 'beta', workspace: 'B' } },
      { id: 'l3', text: 'gamma workspace A', score: 0.85, metadata: { text: 'gamma', workspace: 'A' } },
      { id: 'l4', text: 'delta workspace C', score: 0.80, metadata: { text: 'delta', workspace: 'C' } },
    ];
    return rows.slice(0, k);
  },
};

describe('RemoteMCPEnhancedStore workspace filtering with fusion + topK', () => {
  let store: RemoteMCPEnhancedStore;
  beforeAll(async () => {
    store = new RemoteMCPEnhancedStore(
      localStore as unknown as {
        upsert(chunks: Chunk[]): Promise<void>;
        query(embedding: number[], k?: number): Promise<Array<Chunk & { score?: number }>>;
      },
      {
        enableRemoteRetrieval: true,
        remoteSearchLimit: 4,
        hybridSearchWeights: { local: 0.6, remote: 0.4 },
      } as Record<string, unknown>,
    );
    await store.initialize();
  });

  it('applies workspace filter before topK (weighted fusion)', async () => {
    const results = await store.query([0.1, 0.2, 0.3], {
      hybridSearch: true,
      fusionMethod: 'weighted',
      workspace: 'A',
      topK: 1,
    } as unknown as Parameters<RemoteMCPEnhancedStore['query']>[1]);

    expect(results.length).toBe(1);
    expect(results[0]?.metadata?.workspace).toBe('A');
  });

  it('applies workspace filter before topK (rrf fusion)', async () => {
    const results = await store.query([0.1, 0.2, 0.3], {
      hybridSearch: true,
      fusionMethod: 'rrf',
      rrfK: 60,
      workspace: ['A', 'B'],
      topK: 2,
    } as unknown as Parameters<RemoteMCPEnhancedStore['query']>[1]);

    expect(results.length).toBe(2);
    const workspaces = results.map((r) => (r.metadata as Record<string, unknown> | undefined)?.['workspace']);
    expect(workspaces.every((w) => w === 'A' || w === 'B')).toBe(true);
  });
});
