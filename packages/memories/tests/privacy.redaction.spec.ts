import { describe, it, expect } from 'vitest';
import { MemoryService } from '../src/MemoryService.js';

class FakeQdrant {
  public points: any[] = [];
  async ensureCollection() {}
  async upsert(recs: any[]) { this.points.push(...recs); }
  async search() { return []; }
  async deleteExpired() {}
}
class FakeNeo4j {
  async upsertNode() {}
  async upsertRel() {}
  async neighborhood() { return { nodes: [], rels: [] }; }
}
const embedder = { embed: async (texts: string[]) => texts.map(() => new Array(8).fill(0.5)) };

describe('MemoryService privacy', () => {
  it('redacts email addresses before storage', async () => {
    const q = new FakeQdrant();
    const svc = new MemoryService(q as any, new FakeNeo4j() as any, embedder as any, 8);
    const ctx = { tenantId: 't1' } as any;
    const id = await svc.putText(ctx, 'doc', 'contact me at test@example.com', {});
    const stored = q.points.find((p: any) => p.id === id);
    expect(stored?.text).toBe('contact me at [REDACTED]');
  });
});
