import { describe, it, expect } from 'vitest';
import { rerankDocuments } from '../rerank.js';

describe('rerankDocuments', () => {
  it('returns empty array when docs empty', async () => {
    const res = await rerankDocuments('q', []);
    expect(res).toEqual([]);
  });

  it('ranks relevant documents higher', async () => {
    const res = await rerankDocuments('apple', ['banana', 'apple pie']);
    expect(res[0].text).toBe('apple pie');
    expect(res[0].score).toBeGreaterThanOrEqual(res[1].score);
  });

  it('supports concurrent calls', async () => {
    const queries = ['a', 'b'];
    const docs = [
      ['a x', 'b y'],
      ['b y', 'c z'],
    ];
    const results = await Promise.all(queries.map((q, i) => rerankDocuments(q, docs[i])));
    expect(results).toHaveLength(2);
  });
});
