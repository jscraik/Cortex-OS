import { describe, expect, it } from 'vitest';
import { MemoryService } from '../src/MemoryService.js';
import { MemoryRecord, VectorHit } from '../src/types.js';

class FakeQdrant {
  public points: MemoryRecord[] = [];
  async ensureCollection() {}
  async upsert(recs: MemoryRecord[]) {
    this.points.push(...(recs as any));
  }
  async search({ tenantId, topK }: any): Promise<VectorHit[]> {
    // return first K from same tenant
    return this.points
      .filter((p) => p.tenantId === tenantId)
      .slice(0, topK)
      .map((p, i) => ({
        id: p.id,
        text: p.text,
        metadata: p.metadata as Record<string, unknown>,
        score: 1 - i * 0.01,
        sourceURI: (p as any).sourceURI,
      }));
  }
  async deleteExpired(nowISO: string) {
    const now = new Date(nowISO).toISOString();
    this.points = this.points.filter((p: any) => !p.expireAt || p.expireAt > now);
  }
}

class FakeNeo4j {
  nodes = new Map<string, any>();
  rels: any[] = [];
  async upsertNode(n: any) {
    this.nodes.set(n.id, n);
  }
  async upsertRel(r: any) {
    this.rels.push(r);
  }
  async neighborhood(nodeId: string) {
    if (!this.nodes.has(nodeId)) return { nodes: [], rels: [] };
    return { nodes: [{ id: nodeId, label: 'X', props: {} }], rels: [] };
  }
  async close() {}
}

const embedder = { embed: async (texts: string[]) => texts.map(() => new Array(8).fill(0.5)) };

describe('MemoryService', () => {
  it('guards vector size', async () => {
    const svc = new MemoryService(
      new FakeQdrant() as any,
      new FakeNeo4j() as any,
      embedder as any,
      8,
    );
    await expect(svc.embedOne('ok')).resolves.toHaveLength(8);
    const bad = { embed: async () => [new Array(7).fill(0.1)] };
    const badSvc = new MemoryService(
      new FakeQdrant() as any,
      new FakeNeo4j() as any,
      bad as any,
      8,
    );
    await expect(badSvc.embedOne('x')).rejects.toThrow(/size_mismatch/);
  });

  it('computes expireAt and prunes correctly', async () => {
    const q = new FakeQdrant();
    const svc = new MemoryService(q as any, new FakeNeo4j() as any, embedder as any, 8);
    const ctx = { tenantId: 't1' } as any;
    const id = await svc.putText(ctx, 'doc', 'hello', {}, 1);
    expect(q.points.find((p) => p.id === id)?.expireAt).toBeTruthy();
    // Force prune by advancing time
    await q.deleteExpired(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString());
    expect(q.points.find((p) => p.id === id)).toBeFalsy();
  });

  it('builds simple RAG context', async () => {
    const q = new FakeQdrant();
    const neo = new FakeNeo4j();
    const svc = new MemoryService(q as any, neo as any, embedder as any, 8);
    const ctx = { tenantId: 't1' } as any;
    await svc.putText(ctx, 'doc', 'Cortex uses Neo4j and Qdrant', { nodeId: 'arch:memory' }, 365);
    await neo.upsertNode({ id: 'arch:memory', label: 'Concept', props: {} });
    const { RagPipeline } = await import('../../rag/src/components/RagPipeline');
    const rag = new RagPipeline(svc as any);
    const out = await rag.buildPromptContext({ ctx, query: 'memory', tokenBudget: 500 });
    expect(out.citations.length).toBeGreaterThan(0);
    expect(out.context.length).toBeGreaterThan(0);
  });
});
