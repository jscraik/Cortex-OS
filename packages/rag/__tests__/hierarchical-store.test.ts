import { describe, expect, it } from 'vitest';
import { HierarchicalStore } from '../src/index.js';
import type { Chunk, Store } from '../src/lib/index.js';

// Minimal base store for testing that returns paragraph hit
function createBaseStore(): Store {
  const items: Chunk[] = [];
  return {
    async upsert(chunks: Chunk[]) {
      items.push(...chunks);
    },
    async query(_embedding: number[], _k = 5) {
      // Return only paragraph level as "hit"
      const p = items.find((x) => {
        const meta = x.metadata as Record<string, unknown> | undefined;
        const level = typeof meta?.level === 'string' ? meta.level : undefined;
        return level === 'paragraph';
      });
      return p ? [{ ...p, score: 0.9 }] : [];
    },
  };
}

describe('HierarchicalStore', () => {
  it('expands context with parent chain', async () => {
    const base = createBaseStore();
    const store = new HierarchicalStore(base);

    const doc: Chunk = {
      id: 'doc-1',
      text: 'Doc body text',
      metadata: { level: 'document', heading: 'Document Title' },
    };
    const sec: Chunk = {
      id: 'sec-1',
      text: 'Section text',
      metadata: { level: 'section', parentId: 'doc-1', heading: 'Intro' },
    };
    const para: Chunk = {
      id: 'p-1',
      text: 'Paragraph text',
      metadata: { level: 'paragraph', parentId: 'sec-1' },
    };

    await store.upsert([doc, sec, para]);

    const results = await store.query(new Array(4).fill(0.1), {
      k: 1,
      expandContext: true,
      maxLevels: 2,
    });
    expect(results).toHaveLength(1);
    const r = results[0];
    if (!r) {
      throw new Error('Expected a result');
    }
    expect(r.id).toBe('p-1');
    expect(r.metadata?.context).toBeDefined();
    const ctx = r.metadata?.context as string;
    expect(ctx).toContain('Intro');
    expect(ctx).toContain('Section text');
    expect(ctx).toContain('Document Title');
    expect(ctx).toContain('Doc body text');
  });
});
